import hashlib
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import (
    Class,
    Enrollment,
    User,
    Assignment,
    Rubric,
    Submission,
    Document,
    DocumentVersion,
    DocumentChunk,
    ReferenceSetVersion,
    ReferenceSetDocument,
)
from app.models.enums import Role, ClassRole, AssignmentStatus, SourceType, DocumentStatus
from app.schemas.assignment_schemas import CreateAssignmentSchema, UpdateAssignmentSchema
from app.security.dependencies import get_current_user
from app.services.storage_service import storage
from app.services.extractor_service import extract_text_from_buffer
from app.services.chunker_service import chunk_text

assignments_router = APIRouter(tags=["assignments"])


def process_document_version_background(db_session_factory, version_id: str):
    """Background task to extract and chunk reference documents."""
    db: Session = db_session_factory()
    try:
        version = db.query(DocumentVersion).filter(DocumentVersion.id == version_id).first()
        if not version:
            return

        version.extractionStatus = DocumentStatus.EXTRACTING
        db.commit()

        # Read file from storage
        file_bytes = storage.get_sync(version.objectKey)

        ext = "PDF" if version.mimeType == "application/pdf" or version.originalName.endswith(".pdf") else "DOCX"
        text = extract_text_from_buffer(file_bytes, ext)

        if not text.strip():
            version.extractionStatus = DocumentStatus.FAILED
            version.errorMessage = "Tidak ada teks yang dapat diekstrak dari dokumen"
            db.commit()
            return

        # Chunk text
        chunks = chunk_text(text, max_chunk_chars=1200, overlap_chars=150)
        for c in chunks:
            doc_chunk = DocumentChunk(
                documentVersionId=version.id,
                chunkIndex=c["chunkIndex"],
                tokenEstimate=c["tokenEstimate"],
                rawText=c["rawText"],
                normalizedText=c["normalizedText"],
                locator=c["locator"],
                checksum=c["checksum"],
            )
            db.add(doc_chunk)

        version.extractionStatus = DocumentStatus.REVIEW_REQUIRED
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"[Document Processing Error]: {e}")
        try:
            ver = db.query(DocumentVersion).filter(DocumentVersion.id == version_id).first()
            if ver:
                ver.extractionStatus = DocumentStatus.FAILED
                ver.errorMessage = str(e)
                db.commit()
        except Exception:
            pass
    finally:
        db.close()


@assignments_router.get("/classes/{class_id}/assignments")
async def list_assignments(
    class_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cls = db.query(Class).filter(Class.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    is_dosen = cls.dosenId == current_user.id
    enrollment = (
        db.query(Enrollment)
        .filter(Enrollment.classId == class_id, Enrollment.mahasiswaId == current_user.id)
        .first()
    )
    is_assistant = enrollment and enrollment.role == ClassRole.ASSISTANT
    is_privileged = is_dosen or is_assistant

    if not is_privileged and not enrollment:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    query = db.query(Assignment).filter(Assignment.classId == class_id)
    if not is_privileged:
        query = query.filter(Assignment.status != AssignmentStatus.DRAFT)

    assignments = query.order_by(Assignment.dueDate.asc()).all()

    result = []
    for a in assignments:
        sub_query = db.query(Submission).filter(Submission.assignmentId == a.id)
        if not is_privileged:
            sub_query = sub_query.filter(Submission.mahasiswaId == current_user.id)
        subs = sub_query.all()

        subs_data = []
        for s in subs:
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

            subs_data.append({
                "id": s.id,
                "assignmentId": s.assignmentId,
                "userId": s.mahasiswaId,
                "activeVersionId": s.activeVersionId,
                "releasedGradeId": s.releasedGradeId,
                "createdAt": s.createdAt.isoformat() if s.createdAt else None,
                "grades": grades_data,
                "released": released_grade,
                "versions": [
                    {
                        "id": v.id,
                        "versionNumber": v.versionNumber,
                        "type": v.type.value if hasattr(v.type, "value") else str(v.type),
                        "submittedAt": v.submittedAt.isoformat() if v.submittedAt else None,
                    }
                    for v in s.versions
                ],
            })

        # Rubric criteria with public/private filtering
        rubric_data = None
        if a.rubric:
            rubric_data = {
                "id": a.rubric.id,
                "title": a.rubric.title,
                "criteria": [
                    {
                        "id": cr.id,
                        "label": cr.label,
                        "description": cr.description,
                        "maxScore": cr.maxScore,
                        "weight": cr.weight,
                        "rubricId": cr.rubricId,
                    }
                    for cr in a.rubric.criteria
                ],
            }

        result.append({
            "id": a.id,
            "title": a.title,
            "instructions": a.instructions,
            "submissionType": a.submissionType.value if hasattr(a.submissionType, "value") else str(a.submissionType),
            "dueDate": a.dueDate.isoformat() if a.dueDate else None,
            "maxScore": a.maxScore,
            "allowLateSubmission": a.allowLateSubmission,
            "status": a.status.value if hasattr(a.status, "value") else str(a.status),
            "createdAt": a.createdAt.isoformat() if a.createdAt else None,
            "classId": a.classId,
            "rubricId": a.rubricId,
            "rubric": rubric_data,
            "submissions": subs_data,
            "_count": {"submissions": len(subs)},
        })

    return result


@assignments_router.post("/classes/{class_id}/assignments", status_code=status.HTTP_201_CREATED)
async def create_assignment(
    class_id: str,
    req: CreateAssignmentSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != Role.DOSEN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Hanya dosen yang dapat membuat tugas")

    cls = db.query(Class).filter(Class.id == class_id).first()
    if not cls or cls.dosenId != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Kelas tidak ditemukan atau Anda bukan pengajar di kelas ini",
        )

    if req.rubricId:
        rubric = (
            db.query(Rubric)
            .filter(Rubric.id == req.rubricId, Rubric.classId == class_id)
            .first()
        )
        if not rubric:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Rubrik yang dipilih tidak ditemukan di kelas ini",
            )

    new_assign = Assignment(
        classId=class_id,
        title=req.title,
        instructions=req.instructions,
        submissionType=req.submissionType,
        dueDate=req.dueDate,
        maxScore=req.maxScore,
        allowLateSubmission=req.allowLateSubmission,
        rubricId=req.rubricId,
        status=req.status,
    )
    db.add(new_assign)
    db.commit()
    db.refresh(new_assign)

    return {
        "id": new_assign.id,
        "title": new_assign.title,
        "instructions": new_assign.instructions,
        "submissionType": new_assign.submissionType.value if hasattr(new_assign.submissionType, "value") else str(new_assign.submissionType),
        "dueDate": new_assign.dueDate.isoformat() if new_assign.dueDate else None,
        "maxScore": new_assign.maxScore,
        "allowLateSubmission": new_assign.allowLateSubmission,
        "status": new_assign.status.value if hasattr(new_assign.status, "value") else str(new_assign.status),
        "classId": new_assign.classId,
        "rubricId": new_assign.rubricId,
        "createdAt": new_assign.createdAt.isoformat() if new_assign.createdAt else None,
    }


@assignments_router.get("/classes/{class_id}/assignments/{assignment_id}")
async def get_assignment_detail(
    class_id: str,
    assignment_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cls = db.query(Class).filter(Class.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    is_dosen = cls.dosenId == current_user.id
    enrollment = (
        db.query(Enrollment)
        .filter(Enrollment.classId == class_id, Enrollment.mahasiswaId == current_user.id)
        .first()
    )
    is_assistant = enrollment and enrollment.role == ClassRole.ASSISTANT
    is_privileged = is_dosen or is_assistant

    if not is_privileged and not enrollment:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    query = db.query(Assignment).filter(Assignment.id == assignment_id, Assignment.classId == class_id)
    if not is_privileged:
        query = query.filter(Assignment.status != AssignmentStatus.DRAFT)

    a = query.first()
    if not a:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tugas tidak ditemukan")

    sub_query = db.query(Submission).filter(Submission.assignmentId == a.id)
    if not is_privileged:
        sub_query = sub_query.filter(Submission.mahasiswaId == current_user.id)
    subs = sub_query.all()

    subs_data = []
    for s in subs:
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
                    "tokenUsage": ev.tokenUsage,
                    "status": ev.status,
                    "createdAt": ev.createdAt.isoformat() if ev.createdAt else None,
                })

        subs_data.append({
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
                    "content": v.content,
                    "submittedAt": v.submittedAt.isoformat() if v.submittedAt else None,
                }
                for v in s.versions
            ],
        })

    rubric_data = None
    if a.rubric:
        crit_list = []
        for cr in a.rubric.criteria:
            item = {
                "id": cr.id,
                "label": cr.label,
                "description": cr.description,
                "maxScore": cr.maxScore,
                "weight": cr.weight,
                "rubricId": cr.rubricId,
            }
            if is_privileged:
                item["expectedAnswer"] = cr.expectedAnswer
                item["answerKey"] = cr.answerKey
                item["material"] = cr.material
            crit_list.append(item)

        rubric_data = {
            "id": a.rubric.id,
            "title": a.rubric.title,
            "criteria": crit_list,
        }

    return {
        "id": a.id,
        "title": a.title,
        "instructions": a.instructions,
        "submissionType": a.submissionType.value if hasattr(a.submissionType, "value") else str(a.submissionType),
        "dueDate": a.dueDate.isoformat() if a.dueDate else None,
        "maxScore": a.maxScore,
        "allowLateSubmission": a.allowLateSubmission,
        "status": a.status.value if hasattr(a.status, "value") else str(a.status),
        "createdAt": a.createdAt.isoformat() if a.createdAt else None,
        "classId": a.classId,
        "rubricId": a.rubricId,
        "class": {
            "id": cls.id,
            "name": cls.name,
            "subject": cls.subject,
            "dosenId": cls.dosenId,
            "dosen": {"id": cls.dosen.id, "name": cls.dosen.name, "email": cls.dosen.email} if cls.dosen else None,
        },
        "rubric": rubric_data,
        "submissions": subs_data,
    }


@assignments_router.get("/classes/{class_id}/assignments/{assignment_id}/result")
async def get_assignment_result(
    class_id: str,
    assignment_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    enrollment = (
        db.query(Enrollment)
        .filter(Enrollment.classId == class_id, Enrollment.mahasiswaId == current_user.id)
        .first()
    )
    if not enrollment:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    submission = (
        db.query(Submission)
        .filter(Submission.assignmentId == assignment_id, Submission.mahasiswaId == current_user.id)
        .first()
    )
    if not submission or submission.assignment.classId != class_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hasil tidak ditemukan")

    released_grade = next(
        (g for g in submission.grades if g.id == submission.releasedGradeId and g.status == "RELEASED"),
        None,
    )
    if not released_grade:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nilai belum dirilis")

    # Safe public criteria
    public_criteria = []
    if submission.assignment.rubric:
        for cr in submission.assignment.rubric.criteria:
            public_criteria.append({
                "id": cr.id,
                "label": cr.label,
                "description": cr.description,
                "maxScore": cr.maxScore,
                "weight": cr.weight,
                "rubricId": cr.rubricId,
            })

    return {
        "submission": {
            "id": submission.id,
            "assignmentId": submission.assignmentId,
            "userId": submission.mahasiswaId,
            "activeVersionId": submission.activeVersionId,
            "releasedGradeId": submission.releasedGradeId,
            "createdAt": submission.createdAt.isoformat() if submission.createdAt else None,
            "assignment": {
                "id": submission.assignment.id,
                "title": submission.assignment.title,
                "maxScore": submission.assignment.maxScore,
                "classId": submission.assignment.classId,
                "class": {
                    "id": submission.assignment.class_.id,
                    "name": submission.assignment.class_.name,
                    "dosen": {"name": submission.assignment.class_.dosen.name if submission.assignment.class_.dosen else ""},
                },
                "rubric": {
                    "id": submission.assignment.rubric.id if submission.assignment.rubric else None,
                    "title": submission.assignment.rubric.title if submission.assignment.rubric else "",
                    "criteria": public_criteria,
                }
                if submission.assignment.rubric
                else None,
            },
        },
        "grade": {
            "id": released_grade.id,
            "finalScore": released_grade.finalScore,
            "finalFeedback": released_grade.finalFeedback,
            "isAIAssisted": released_grade.isAIAssisted,
            "status": released_grade.status,
            "createdAt": released_grade.createdAt.isoformat() if released_grade.createdAt else None,
        },
    }


@assignments_router.patch("/classes/{class_id}/assignments/{assignment_id}")
async def update_assignment(
    class_id: str,
    assignment_id: str,
    req: UpdateAssignmentSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != Role.DOSEN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    cls = db.query(Class).filter(Class.id == class_id).first()
    if not cls or cls.dosenId != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    assignment = (
        db.query(Assignment)
        .filter(Assignment.id == assignment_id, Assignment.classId == class_id)
        .first()
    )
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tugas tidak ditemukan")

    if req.rubricId:
        rubric = (
            db.query(Rubric)
            .filter(Rubric.id == req.rubricId, Rubric.classId == class_id)
            .first()
        )
        if not rubric:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Rubrik tidak tersedia di kelas ini",
            )
        assignment.rubricId = req.rubricId

    if req.title is not None:
        assignment.title = req.title
    if req.instructions is not None:
        assignment.instructions = req.instructions
    if req.submissionType is not None:
        assignment.submissionType = req.submissionType
    if req.dueDate is not None:
        assignment.dueDate = req.dueDate
    if req.maxScore is not None:
        assignment.maxScore = req.maxScore
    if req.allowLateSubmission is not None:
        assignment.allowLateSubmission = req.allowLateSubmission
    if req.status is not None:
        assignment.status = req.status

    db.commit()
    db.refresh(assignment)

    return {
        "id": assignment.id,
        "title": assignment.title,
        "instructions": assignment.instructions,
        "submissionType": assignment.submissionType.value if hasattr(assignment.submissionType, "value") else str(assignment.submissionType),
        "dueDate": assignment.dueDate.isoformat() if assignment.dueDate else None,
        "maxScore": assignment.maxScore,
        "allowLateSubmission": assignment.allowLateSubmission,
        "status": assignment.status.value if hasattr(assignment.status, "value") else str(assignment.status),
        "classId": assignment.classId,
        "rubricId": assignment.rubricId,
    }


@assignments_router.delete("/classes/{class_id}/assignments/{assignment_id}")
async def delete_assignment(
    class_id: str,
    assignment_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != Role.DOSEN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    cls = db.query(Class).filter(Class.id == class_id).first()
    if not cls or cls.dosenId != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    assignment = (
        db.query(Assignment)
        .filter(Assignment.id == assignment_id, Assignment.classId == class_id)
        .first()
    )
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tugas tidak ditemukan")

    db.delete(assignment)
    db.commit()

    return {"success": True, "message": "Tugas berhasil dihapus"}


@assignments_router.post("/classes/{class_id}/assignments/{assignment_id}/reference-documents", status_code=status.HTTP_202_ACCEPTED)
async def upload_reference_document(
    class_id: str,
    assignment_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    sourceType: str = Form("MATERIAL"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cls = db.query(Class).filter(Class.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    is_dosen = cls.dosenId == current_user.id
    enrollment = (
        db.query(Enrollment)
        .filter(Enrollment.classId == class_id, Enrollment.mahasiswaId == current_user.id)
        .first()
    )
    is_assistant = enrollment and enrollment.role == ClassRole.ASSISTANT
    if not is_dosen and not is_assistant:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    assignment = (
        db.query(Assignment)
        .filter(Assignment.id == assignment_id, Assignment.classId == class_id)
        .first()
    )
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tugas tidak ditemukan")

    file_bytes = await file.read()
    if len(file_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ukuran file maksimal 10MB")

    checksum = hashlib.sha256(file_bytes).hexdigest()
    object_key = storage.save_sync(file.filename or "document.pdf", file_bytes)

    source_enum = SourceType.ANSWER_KEY if sourceType == "ANSWER_KEY" else SourceType.MATERIAL

    # Find or create Document
    doc = (
        db.query(Document)
        .filter(Document.assignmentId == assignment_id, Document.sourceType == source_enum)
        .first()
    )
    if not doc:
        doc = Document(
            assignmentId=assignment_id,
            ownerId=current_user.id,
            sourceType=source_enum,
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)

    latest_ver = (
        db.query(DocumentVersion)
        .filter(DocumentVersion.documentId == doc.id)
        .order_by(DocumentVersion.versionNumber.desc())
        .first()
    )
    next_ver_num = (latest_ver.versionNumber + 1) if latest_ver else 1

    version = DocumentVersion(
        documentId=doc.id,
        versionNumber=next_ver_num,
        objectKey=object_key,
        originalName=file.filename,
        mimeType=file.content_type or "application/octet-stream",
        checksum=checksum,
        size=len(file_bytes),
        extractionStatus=DocumentStatus.UPLOADED,
    )
    db.add(version)
    db.commit()
    db.refresh(version)

    # Queue background parsing
    from app.database import SessionLocal
    background_tasks.add_task(process_document_version_background, SessionLocal, version.id)

    return {
        "success": True,
        "documentId": doc.id,
        "versionId": version.id,
        "versionNumber": version.versionNumber,
        "status": version.extractionStatus.value,
    }


@assignments_router.post("/classes/{class_id}/assignments/{assignment_id}/reference-sets", status_code=status.HTTP_201_CREATED)
async def create_reference_set(
    class_id: str,
    assignment_id: str,
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != Role.DOSEN:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")

    cls = db.query(Class).filter(Class.id == class_id).first()
    if not cls or cls.dosenId != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    assignment = (
        db.query(Assignment)
        .filter(Assignment.id == assignment_id, Assignment.classId == class_id)
        .first()
    )
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tugas tidak ditemukan")

    doc_ids = payload.get("documentVersionIds")
    if not isinstance(doc_ids, list) or len(doc_ids) < 1 or len(doc_ids) > 20:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Pilih 1–20 versi dokumen yang valid")

    unique_doc_ids = list(set(doc_ids))
    valid_docs = (
        db.query(DocumentVersion)
        .join(Document, Document.id == DocumentVersion.documentId)
        .filter(DocumentVersion.id.in_(unique_doc_ids), Document.assignmentId == assignment_id)
        .all()
    )
    if len(valid_docs) != len(unique_doc_ids):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Dokumen harus berasal dari tugas ini")

    latest_set = (
        db.query(ReferenceSetVersion)
        .filter(ReferenceSetVersion.assignmentId == assignment_id)
        .order_by(ReferenceSetVersion.versionNumber.desc())
        .first()
    )
    next_set_num = (latest_set.versionNumber + 1) if latest_set else 1

    ref_set = ReferenceSetVersion(
        assignmentId=assignment_id,
        versionNumber=next_set_num,
    )
    db.add(ref_set)
    db.commit()
    db.refresh(ref_set)

    for vid in unique_doc_ids:
        link = ReferenceSetDocument(referenceSetId=ref_set.id, documentVersionId=vid)
        db.add(link)
    db.commit()

    return {
        "id": ref_set.id,
        "assignmentId": ref_set.assignmentId,
        "versionNumber": ref_set.versionNumber,
        "documents": [{"documentVersionId": vid} for vid in unique_doc_ids],
    }


@assignments_router.get("/assignments-overview")
async def get_assignments_overview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    is_dosen = current_user.role == Role.DOSEN

    if is_dosen:
        classes = (
            db.query(Class)
            .filter(Class.dosenId == current_user.id, Class.isArchived == False)
            .order_by(Class.createdAt.desc())
            .all()
        )
        rubrics = (
            db.query(Rubric)
            .join(Class, Class.id == Rubric.classId)
            .filter(Class.dosenId == current_user.id)
            .order_by(Rubric.createdAt.desc())
            .all()
        )

        classes_data = []
        for c in classes:
            assigns_data = []
            for a in c.assignments:
                sub_count = db.query(Submission).filter(Submission.assignmentId == a.id).count()
                assigns_data.append({
                    "id": a.id,
                    "title": a.title,
                    "instructions": a.instructions,
                    "dueDate": a.dueDate.isoformat() if a.dueDate else None,
                    "maxScore": a.maxScore,
                    "status": a.status.value if hasattr(a.status, "value") else str(a.status),
                    "classId": a.classId,
                    "rubricId": a.rubricId,
                    "createdAt": a.createdAt.isoformat() if a.createdAt else None,
                    "rubric": {
                        "id": a.rubric.id,
                        "title": a.rubric.title,
                        "criteria": [
                            {
                                "id": cr.id,
                                "label": cr.label,
                                "description": cr.description,
                                "maxScore": cr.maxScore,
                                "weight": cr.weight,
                                "rubricId": cr.rubricId,
                            }
                            for cr in a.rubric.criteria
                        ],
                    }
                    if a.rubric
                    else None,
                    "_count": {"submissions": sub_count},
                })

            classes_data.append({
                "id": c.id,
                "name": c.name,
                "subject": c.subject,
                "assignments": assigns_data,
                "_count": {
                    "enrollments": len(c.enrollments),
                    "assignments": len(c.assignments),
                },
            })

        rubrics_data = [
            {
                "id": r.id,
                "title": r.title,
                "classId": r.classId,
                "createdAt": r.createdAt.isoformat() if r.createdAt else None,
                "class": {"id": r.class_.id, "name": r.class_.name} if r.class_ else None,
                "_count": {"assignments": len(r.assignments)},
                "criteria": [
                    {
                        "id": cr.id,
                        "label": cr.label,
                        "description": cr.description,
                        "maxScore": cr.maxScore,
                        "weight": cr.weight,
                        "rubricId": cr.rubricId,
                    }
                    for cr in r.criteria
                ],
            }
            for r in rubrics
        ]

        return {
            "role": "DOSEN",
            "classes": classes_data,
            "rubrics": rubrics_data,
        }

    # Student Overview
    enrollments = (
        db.query(Enrollment)
        .filter(Enrollment.mahasiswaId == current_user.id)
        .all()
    )

    enrollments_data = []
    for e in enrollments:
        c = e.class_
        assigns_data = []
        for a in c.assignments:
            if a.status != AssignmentStatus.PUBLISHED:
                continue

            sub = (
                db.query(Submission)
                .filter(Submission.assignmentId == a.id, Submission.mahasiswaId == current_user.id)
                .first()
            )
            subs_data = []
            if sub:
                released_grade = next(
                    (g for g in sub.grades if g.id == sub.releasedGradeId and g.status == "RELEASED"),
                    None,
                )
                subs_data.append({
                    "id": sub.id,
                    "assignmentId": sub.assignmentId,
                    "userId": sub.mahasiswaId,
                    "activeVersionId": sub.activeVersionId,
                    "releasedGradeId": sub.releasedGradeId,
                    "createdAt": sub.createdAt.isoformat() if sub.createdAt else None,
                    "grades": [
                        {
                            "id": released_grade.id,
                            "finalScore": released_grade.finalScore,
                            "finalFeedback": released_grade.finalFeedback,
                            "isAIAssisted": released_grade.isAIAssisted,
                            "createdAt": released_grade.createdAt.isoformat() if released_grade.createdAt else None,
                        }
                    ]
                    if released_grade
                    else [],
                    "versions": [
                        {
                            "id": v.id,
                            "versionNumber": v.versionNumber,
                            "type": v.type.value if hasattr(v.type, "value") else str(v.type),
                            "submittedAt": v.submittedAt.isoformat() if v.submittedAt else None,
                        }
                        for v in sub.versions
                    ],
                })

            assigns_data.append({
                "id": a.id,
                "title": a.title,
                "dueDate": a.dueDate.isoformat() if a.dueDate else None,
                "maxScore": a.maxScore,
                "status": a.status.value if hasattr(a.status, "value") else str(a.status),
                "classId": a.classId,
                "rubric": {
                    "id": a.rubric.id,
                    "title": a.rubric.title,
                    "criteria": [
                        {
                            "id": cr.id,
                            "label": cr.label,
                            "description": cr.description,
                            "maxScore": cr.maxScore,
                            "weight": cr.weight,
                            "rubricId": cr.rubricId,
                        }
                        for cr in a.rubric.criteria
                    ],
                }
                if a.rubric
                else None,
                "submissions": subs_data,
            })

        enrollments_data.append({
            "id": e.id,
            "role": e.role.value if hasattr(e.role, "value") else str(e.role),
            "classId": e.classId,
            "userId": e.mahasiswaId,
            "joinedAt": e.joinedAt.isoformat() if e.joinedAt else None,
            "class": {
                "id": c.id,
                "name": c.name,
                "subject": c.subject,
                "enrollmentKey": "",
                "assignments": assigns_data,
            },
        })

    return {
        "role": "MAHASISWA",
        "enrollments": enrollments_data,
    }
