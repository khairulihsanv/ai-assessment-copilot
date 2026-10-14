import json
import asyncio
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db, SessionLocal
from app.models.models import (
    Class,
    Enrollment,
    User,
    Assignment,
    Submission,
    SubmissionVersion,
    EvaluationRun,
    GradeRevision,
)
from app.models.enums import Role, ClassRole, SubmissionType, AssignmentStatus
from app.schemas.submission_schemas import FinalizeSchema, RevertFinalizeSchema
from app.security.dependencies import get_current_user
from app.services.storage_service import storage
from app.services.extractor_service import extract_text_from_buffer
from app.services.evaluator_service import evaluate_submission

submissions_router = APIRouter(tags=["submissions"])


@submissions_router.get("/classes/{class_id}/assignments/{assignment_id}/submissions")
async def list_submissions(
    class_id: str,
    assignment_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    assignment = (
        db.query(Assignment)
        .filter(Assignment.id == assignment_id, Assignment.classId == class_id)
        .first()
    )
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tugas tidak ditemukan")

    is_dosen = assignment.class_.dosenId == current_user.id
    enrollment = (
        db.query(Enrollment)
        .filter(Enrollment.classId == class_id, Enrollment.mahasiswaId == current_user.id)
        .first()
    )
    is_assistant = enrollment and enrollment.role == ClassRole.ASSISTANT
    is_privileged = is_dosen or is_assistant

    if not is_privileged and not enrollment:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Akses ditolak")
    if not is_privileged and assignment.status == AssignmentStatus.DRAFT:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tugas tidak ditemukan")

    query = db.query(Submission).filter(Submission.assignmentId == assignment_id)
    if not is_privileged:
        query = query.filter(Submission.mahasiswaId == current_user.id)

    submissions = query.order_by(Submission.createdAt.desc()).all()

    result = []
    for s in submissions:
        grades_data = []
        for g in s.grades:
            if is_privileged or g.status == "RELEASED":
                grades_data.append({
                    "id": g.id,
                    "status": g.status,
                    "finalScore": g.finalScore,
                    "finalFeedback": g.finalFeedback,
                    "isAIAssisted": g.isAIAssisted,
                    "createdAt": g.createdAt.isoformat() if g.createdAt else None,
                })

        released_grade = next((g for g in grades_data if g["id"] == s.releasedGradeId), None)

        evals_data = []
        if is_privileged:
            for ev in s.evaluations:
                evals_data.append({
                    "id": ev.id,
                    "versionId": ev.versionId,
                    "rawModelOutput": ev.rawModelOutput,
                    "perCriterionScore": ev.perCriterionScore,
                    "suggestedTotalScore": ev.suggestedTotalScore,
                    "suggestedFeedback": ev.suggestedFeedback,
                    "status": ev.status,
                    "createdAt": ev.createdAt.isoformat() if ev.createdAt else None,
                })

        result.append({
            "id": s.id,
            "assignmentId": s.assignmentId,
            "userId": s.mahasiswaId,
            "user": {
                "id": s.user.id,
                "name": s.user.name,
                "email": s.user.email,
            }
            if s.user
            else None,
            "activeVersionId": s.activeVersionId,
            "releasedGradeId": s.releasedGradeId,
            "createdAt": s.createdAt.isoformat() if s.createdAt else None,
            "grades": grades_data,
            "released": released_grade,
            "evaluations": evals_data,
            "versions": [
                {
                    "id": v.id,
                    "versionNumber": v.versionNumber,
                    "type": v.type.value if hasattr(v.type, "value") else str(v.type),
                    "fileUrl": v.fileUrl,
                    "fileName": v.fileName,
                    "submittedAt": v.submittedAt.isoformat() if v.submittedAt else None,
                }
                for v in s.versions
            ],
        })

    return result


@submissions_router.post("/classes/{class_id}/assignments/{assignment_id}/submissions", status_code=status.HTTP_201_CREATED)
async def submit_assignment(
    class_id: str,
    assignment_id: str,
    file: Optional[UploadFile] = File(None),
    content: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != Role.MAHASISWA:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Hanya mahasiswa yang dapat mengumpulkan tugas")

    enrollment = (
        db.query(Enrollment)
        .filter(Enrollment.classId == class_id, Enrollment.mahasiswaId == current_user.id)
        .first()
    )
    if not enrollment or enrollment.role != ClassRole.STUDENT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Anda belum terdaftar di kelas ini")

    assignment = (
        db.query(Assignment)
        .filter(Assignment.id == assignment_id, Assignment.classId == class_id)
        .first()
    )
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tugas tidak ditemukan")

    if assignment.status != AssignmentStatus.PUBLISHED:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tugas tidak menerima pengumpulan")

    now = datetime.now()
    if now > assignment.dueDate and not assignment.allowLateSubmission:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tenggat waktu pengumpulan tugas ini telah berakhir")

    sub_type = SubmissionType.TEXT
    file_url = None
    file_name = None
    extracted_content = content

    if file and file.filename:
        file_bytes = await file.read()
        if len(file_bytes) > 10 * 1024 * 1024:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ukuran file melebihi batas maksimum 10MB")

        orig_lower = file.filename.lower()
        if orig_lower.endswith(".pdf"):
            sub_type = SubmissionType.PDF
        elif orig_lower.endswith(".docx"):
            sub_type = SubmissionType.DOCX
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Format file tidak didukung. Harap unggah file .pdf atau .docx")

        if assignment.submissionType != SubmissionType.ANY and assignment.submissionType != sub_type:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Tugas ini hanya menerima format {assignment.submissionType.value}")

        obj_key = storage.save_sync(file.filename, file_bytes)
        file_url = obj_key
        file_name = file.filename

        # Extract text from file for evaluation
        try:
            extracted_content = extract_text_from_buffer(file_bytes, sub_type.value)
        except Exception:
            extracted_content = content or ""
    elif not content or not content.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Harap unggah file atau masukkan teks jawaban")

    # Find or create Submission
    submission = (
        db.query(Submission)
        .filter(Submission.assignmentId == assignment_id, Submission.mahasiswaId == current_user.id)
        .first()
    )
    if not submission:
        submission = Submission(
            assignmentId=assignment_id,
            mahasiswaId=current_user.id,
        )
        db.add(submission)
        db.commit()
        db.refresh(submission)

    latest_ver = (
        db.query(SubmissionVersion)
        .filter(SubmissionVersion.submissionId == submission.id)
        .order_by(SubmissionVersion.versionNumber.desc())
        .first()
    )
    next_ver_num = (latest_ver.versionNumber + 1) if latest_ver else 1

    sub_version = SubmissionVersion(
        submissionId=submission.id,
        versionNumber=next_ver_num,
        type=sub_type,
        content=extracted_content,
        fileUrl=file_url,
        fileName=file_name,
    )
    db.add(sub_version)
    db.commit()
    db.refresh(sub_version)

    submission.activeVersionId = sub_version.id
    db.commit()

    return {
        "success": True,
        "submissionId": submission.id,
        "versionId": sub_version.id,
        "versionNumber": sub_version.versionNumber,
    }


@submissions_router.get("/submissions/{submission_id}")
async def get_submission_detail(
    submission_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sub = db.query(Submission).filter(Submission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pengumpulan tugas tidak ditemukan")

    cls = sub.assignment.class_
    is_dosen = cls.dosenId == current_user.id
    enrollment = (
        db.query(Enrollment)
        .filter(Enrollment.classId == cls.id, Enrollment.mahasiswaId == current_user.id)
        .first()
    )
    is_assistant = enrollment and enrollment.role == ClassRole.ASSISTANT
    is_owner_student = sub.mahasiswaId == current_user.id
    is_privileged = is_dosen or is_assistant

    if not is_privileged and not is_owner_student:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Akses ditolak")

    grades_data = []
    for g in sub.grades:
        if is_privileged or g.status == "RELEASED":
            grades_data.append({
                "id": g.id,
                "submissionId": g.submissionId,
                "versionId": g.versionId,
                "status": g.status,
                "finalScore": g.finalScore,
                "finalFeedback": g.finalFeedback,
                "isAIAssisted": g.isAIAssisted,
                "editedFromAI": g.editedFromAI,
                "gradedById": g.gradedById,
                "createdAt": g.createdAt.isoformat() if g.createdAt else None,
            })

    evals_data = []
    if is_privileged:
        for ev in sub.evaluations:
            evals_data.append({
                "id": ev.id,
                "submissionId": ev.submissionId,
                "versionId": ev.versionId,
                "rawModelOutput": ev.rawModelOutput,
                "perCriterionScore": ev.perCriterionScore,
                "suggestedTotalScore": ev.suggestedTotalScore,
                "suggestedFeedback": ev.suggestedFeedback,
                "tokenUsage": ev.tokenUsage,
                "status": ev.status,
                "createdAt": ev.createdAt.isoformat() if ev.createdAt else None,
            })

    versions_data = [
        {
            "id": v.id,
            "submissionId": v.submissionId,
            "versionNumber": v.versionNumber,
            "type": v.type.value if hasattr(v.type, "value") else str(v.type),
            "content": v.content,
            "fileUrl": v.fileUrl,
            "fileName": v.fileName,
            "submittedAt": v.submittedAt.isoformat() if v.submittedAt else None,
        }
        for v in sub.versions
    ]

    rubric_data = None
    if sub.assignment.rubric:
        rubric_data = {
            "id": sub.assignment.rubric.id,
            "title": sub.assignment.rubric.title,
            "criteria": [
                {
                    "id": cr.id,
                    "label": cr.label,
                    "description": cr.description,
                    "maxScore": cr.maxScore,
                    "weight": cr.weight,
                    "expectedAnswer": cr.expectedAnswer if is_privileged else None,
                    "answerKey": cr.answerKey if is_privileged else None,
                    "material": cr.material if is_privileged else None,
                    "rubricId": cr.rubricId,
                }
                for cr in sub.assignment.rubric.criteria
            ],
        }

    return {
        "id": sub.id,
        "assignmentId": sub.assignmentId,
        "userId": sub.mahasiswaId,
        "activeVersionId": sub.activeVersionId,
        "releasedGradeId": sub.releasedGradeId,
        "createdAt": sub.createdAt.isoformat() if sub.createdAt else None,
        "user": {
            "id": sub.user.id,
            "name": sub.user.name,
            "email": sub.user.email,
        }
        if sub.user
        else None,
        "assignment": {
            "id": sub.assignment.id,
            "title": sub.assignment.title,
            "instructions": sub.assignment.instructions,
            "submissionType": sub.assignment.submissionType.value if hasattr(sub.assignment.submissionType, "value") else str(sub.assignment.submissionType),
            "dueDate": sub.assignment.dueDate.isoformat() if sub.assignment.dueDate else None,
            "maxScore": sub.assignment.maxScore,
            "classId": sub.assignment.classId,
            "class": {
                "id": cls.id,
                "name": cls.name,
                "dosenId": cls.dosenId,
            },
            "rubric": rubric_data,
        },
        "grades": grades_data,
        "evaluations": evals_data,
        "versions": versions_data,
    }


@submissions_router.post("/submissions/{submission_id}/grade")
async def grade_submission_endpoint(
    submission_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != Role.DOSEN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Hanya dosen yang dapat menjalankan penilaian AI")

    sub = db.query(Submission).filter(Submission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pengumpulan tugas tidak ditemukan")

    if sub.assignment.class_.dosenId != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Anda bukan pengajar kelas ini")

    active_ver = (
        db.query(SubmissionVersion)
        .filter(SubmissionVersion.id == sub.activeVersionId)
        .first()
    )
    if not active_ver:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Versi aktif tugas tidak ditemukan")

    student_answer = active_ver.content or ""
    if not student_answer.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Teks jawaban mahasiswa kosong")

    if not sub.assignment.rubric or not sub.assignment.rubric.criteria:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tugas belum memiliki kriteria rubrik penilaian")

    criteria_list = [
        {
            "id": cr.id,
            "label": cr.label,
            "description": cr.description,
            "maxScore": cr.maxScore,
            "weight": cr.weight,
            "answerKey": cr.answerKey,
            "material": cr.material,
            "answerKeyEmbedding": cr.answerKeyEmbedding,
            "materialEmbedding": cr.materialEmbedding,
        }
        for cr in sub.assignment.rubric.criteria
    ]

    result = await evaluate_submission(
        assignment_title=sub.assignment.title,
        assignment_instructions=sub.assignment.instructions,
        assignment_max_score=sub.assignment.maxScore,
        criteria=criteria_list,
        student_answer=student_answer,
    )

    ev_run = EvaluationRun(
        submissionId=sub.id,
        versionId=active_ver.id,
        rawModelOutput=result["rawOutput"],
        perCriterionScore=result["response"]["perCriterion"],
        suggestedTotalScore=result["response"]["suggestedTotalScore"],
        suggestedFeedback=result["response"]["suggestedFeedback"],
        tokenUsage=result["tokenUsage"],
        status="COMPLETED",
    )
    db.add(ev_run)
    db.commit()
    db.refresh(ev_run)

    return {
        "success": True,
        "aiEvaluation": {
            "id": ev_run.id,
            "submissionId": ev_run.submissionId,
            "versionId": ev_run.versionId,
            "perCriterionScore": ev_run.perCriterionScore,
            "suggestedTotalScore": ev_run.suggestedTotalScore,
            "suggestedFeedback": ev_run.suggestedFeedback,
            "tokenUsage": ev_run.tokenUsage,
            "status": ev_run.status,
            "createdAt": ev_run.createdAt.isoformat() if ev_run.createdAt else None,
        },
    }


@submissions_router.get("/submissions/{submission_id}/grade/stream")
async def grade_submission_stream(
    submission_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != Role.DOSEN:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")

    sub = db.query(Submission).filter(Submission.id == submission_id).first()
    if not sub or sub.assignment.class_.dosenId != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    active_ver = (
        db.query(SubmissionVersion)
        .filter(SubmissionVersion.id == sub.activeVersionId)
        .first()
    )
    if not active_ver or not active_ver.content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Konten tidak ditemukan")

    criteria_list = [
        {
            "id": cr.id,
            "label": cr.label,
            "description": cr.description,
            "maxScore": cr.maxScore,
            "weight": cr.weight,
            "answerKey": cr.answerKey,
            "material": cr.material,
            "answerKeyEmbedding": cr.answerKeyEmbedding,
            "materialEmbedding": cr.materialEmbedding,
        }
        for cr in sub.assignment.rubric.criteria
    ] if sub.assignment.rubric else []

    async def event_generator():
        # Step 1: Init
        yield f"data: {json.dumps({'type': 'progress', 'step': 'Mempersiapkan konteks evaluasi dan rubrik...', 'progress': 15})}\n\n"
        await asyncio.sleep(0.3)

        # Step 2: Semantic embedding
        yield f"data: {json.dumps({'type': 'progress', 'step': 'Menganalisis kemiripan semantik dengan acuan materi...', 'progress': 45})}\n\n"
        await asyncio.sleep(0.4)

        # Step 3: Run evaluation
        yield f"data: {json.dumps({'type': 'progress', 'step': 'Menjalankan evaluasi AI berbasis bukti...', 'progress': 75})}\n\n"

        res = await evaluate_submission(
            assignment_title=sub.assignment.title,
            assignment_instructions=sub.assignment.instructions,
            assignment_max_score=sub.assignment.maxScore,
            criteria=criteria_list,
            student_answer=active_ver.content,
        )

        # Save to DB
        with SessionLocal() as tx_db:
            ev_run = EvaluationRun(
                submissionId=sub.id,
                versionId=active_ver.id,
                rawModelOutput=res["rawOutput"],
                perCriterionScore=res["response"]["perCriterion"],
                suggestedTotalScore=res["response"]["suggestedTotalScore"],
                suggestedFeedback=res["response"]["suggestedFeedback"],
                tokenUsage=res["tokenUsage"],
                status="COMPLETED",
            )
            tx_db.add(ev_run)
            tx_db.commit()
            tx_db.refresh(ev_run)

            output_payload = {
                "type": "result",
                "aiEvaluation": {
                    "id": ev_run.id,
                    "submissionId": ev_run.submissionId,
                    "versionId": ev_run.versionId,
                    "perCriterionScore": ev_run.perCriterionScore,
                    "suggestedTotalScore": ev_run.suggestedTotalScore,
                    "suggestedFeedback": ev_run.suggestedFeedback,
                    "tokenUsage": ev_run.tokenUsage,
                    "status": ev_run.status,
                    "createdAt": ev_run.createdAt.isoformat() if ev_run.createdAt else None,
                },
            }
            yield f"data: {json.dumps(output_payload)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@submissions_router.post("/submissions/{submission_id}/finalize")
async def finalize_grade(
    submission_id: str,
    req: FinalizeSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != Role.DOSEN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Hanya dosen yang dapat memfinalisasi nilai")

    sub = db.query(Submission).filter(Submission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pengumpulan tugas tidak ditemukan")

    if sub.assignment.class_.dosenId != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Anda bukan pengajar kelas ini")

    # Optimistic concurrency check
    if (
        sub.activeVersionId != req.expectedSubmissionVersionId
        or sub.releasedGradeId != req.expectedReleasedGradeId
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Jawaban atau nilai telah berubah. Muat ulang sebelum merilis.",
        )

    if req.finalScore > sub.assignment.maxScore:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Skor tidak boleh melebihi skor maksimal tugas ({sub.assignment.maxScore})",
        )

    # Supersede previous released grade
    if req.expectedReleasedGradeId:
        prev_grade = (
            db.query(GradeRevision)
            .filter(
                GradeRevision.id == req.expectedReleasedGradeId,
                GradeRevision.submissionId == submission_id,
                GradeRevision.status == "RELEASED",
            )
            .first()
        )
        if prev_grade:
            prev_grade.status = "SUPERSEDED"

    # Create new GradeRevision
    new_grade = GradeRevision(
        submissionId=submission_id,
        versionId=req.expectedSubmissionVersionId,
        status="RELEASED",
        finalScore=req.finalScore,
        finalFeedback=req.finalFeedback,
        isAIAssisted=req.isAIAssisted,
        editedFromAI=req.editedFromAI,
        gradedById=current_user.id,
    )
    db.add(new_grade)
    db.commit()
    db.refresh(new_grade)

    sub.releasedGradeId = new_grade.id
    db.commit()

    return {
        "success": True,
        "grade": {
            "id": new_grade.id,
            "submissionId": new_grade.submissionId,
            "versionId": new_grade.versionId,
            "status": new_grade.status,
            "finalScore": new_grade.finalScore,
            "finalFeedback": new_grade.finalFeedback,
            "isAIAssisted": new_grade.isAIAssisted,
            "editedFromAI": new_grade.editedFromAI,
            "gradedById": new_grade.gradedById,
            "createdAt": new_grade.createdAt.isoformat() if new_grade.createdAt else None,
        },
    }


@submissions_router.post("/submissions/{submission_id}/revert-finalize")
async def revert_finalize_grade(
    submission_id: str,
    req: RevertFinalizeSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != Role.DOSEN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    sub = db.query(Submission).filter(Submission.id == submission_id).first()
    if not sub or sub.assignment.class_.dosenId != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    if sub.releasedGradeId != req.expectedReleasedGradeId:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Nilai aktif telah berubah. Muat ulang.")

    curr_grade = (
        db.query(GradeRevision)
        .filter(GradeRevision.id == req.expectedReleasedGradeId, GradeRevision.submissionId == submission_id)
        .first()
    )
    if curr_grade:
        curr_grade.status = "WITHDRAWN"
        if req.reason:
            curr_grade.changeReason = req.reason

    sub.releasedGradeId = None
    db.commit()

    return {"success": True, "message": "Nilai berhasil ditarik kembali"}


@submissions_router.get("/submissions/{submission_id}/file")
async def download_submission_file(
    submission_id: str,
    versionId: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sub = db.query(Submission).filter(Submission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    cls = sub.assignment.class_
    is_dosen = cls.dosenId == current_user.id
    enrollment = (
        db.query(Enrollment)
        .filter(Enrollment.classId == cls.id, Enrollment.mahasiswaId == current_user.id)
        .first()
    )
    is_assistant = enrollment and enrollment.role == ClassRole.ASSISTANT
    is_owner = sub.mahasiswaId == current_user.id

    if not is_dosen and not is_assistant and not is_owner:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    ver_id = versionId or sub.activeVersionId
    ver = db.query(SubmissionVersion).filter(SubmissionVersion.id == ver_id).first()
    if not ver or not ver.fileUrl:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File tidak ditemukan")

    file_bytes = storage.get_sync(ver.fileUrl)
    media_type = "application/pdf" if ver.type == SubmissionType.PDF else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

    return Response(
        content=file_bytes,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{ver.fileName or "jawaban"}"'},
    )
