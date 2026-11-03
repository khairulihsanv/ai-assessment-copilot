import asyncio
import inspect
import json
import logging
from datetime import datetime
from typing import Any

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    Response,
    UploadFile,
    status,
)
from fastapi.responses import StreamingResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import SessionLocal, get_db
from app.models.enums import AssignmentStatus, ClassRole, Role, SubmissionType
from app.models.models import (
    Assignment,
    Enrollment,
    EvaluationRun,
    GradeRevision,
    Submission,
    SubmissionPage,
    SubmissionVersion,
    User,
)
from app.schemas.submission_schemas import FinalizeSchema, RevertFinalizeSchema
from app.security.dependencies import get_current_user
from app.services.embedding_service import generate_embedding_result
from app.services.evaluator_service import (
    EvaluationFailedError,
    evaluate_submission,
    weighted_total,
)
from app.services.extractor_service import (
    CorruptDocumentError,
    EmptyExtractedTextError,
    InvalidFormatError,
    extract_text_from_buffer,
)
from app.services.ocr_service import (
    MAX_IMAGE_SIZE_BYTES,
    MAX_PAGES_ALLOWED,
    InvalidImageFormatError,
    detect_image_format,
    ocr_service,
)
from app.services.storage_service import storage

logger = logging.getLogger(__name__)

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
            if is_privileged or (g.status == "RELEASED" and g.id == s.releasedGradeId):
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

        item = {
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
        }
        if is_privileged:
            item["evaluations"] = evals_data

        result.append(item)

    return result


@submissions_router.post("/classes/{class_id}/assignments/{assignment_id}/submissions/ocr-scan")
async def ocr_scan_preview(
    class_id: str,
    assignment_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != Role.MAHASISWA:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Hanya mahasiswa yang dapat melakukan scan tugas",
        )

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

    if not assignment.allowScan and assignment.submissionType not in (SubmissionType.ANY, SubmissionType.SCAN):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Fitur scan tidak diizinkan untuk penugasan ini oleh dosen. Penugasan tidak mengizinkan pengumpulan berbasis scan.",
        )

    form = await request.form()
    uploaded_files: list[UploadFile] = []

    for _key, val in form.multi_items():
        if hasattr(val, "read") and hasattr(val, "filename"):
            uploaded_files.append(val)

    if not uploaded_files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tidak ada gambar atau dokumen yang diunggah untuk dipindai OCR.",
        )

    if len(uploaded_files) > MAX_PAGES_ALLOWED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maksimal {MAX_PAGES_ALLOWED} halaman yang dapat diproses sekaligus.",
        )

    # Validate file size and magic bytes upfront
    for up_file in uploaded_files:
        f_bytes = await up_file.read()
        await up_file.seek(0)
        if len(f_bytes) > MAX_IMAGE_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File {getattr(up_file, 'filename', '')} melebihi batas 10MB per halaman.",
            )
        try:
            detect_image_format(f_bytes)
        except InvalidImageFormatError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File {getattr(up_file, 'filename', '')} bukan gambar atau PDF yang valid.",
            )

    pages_output: list[dict[str, Any]] = []

    first_name = (getattr(uploaded_files[0], "filename", "") or "").lower()
    if len(uploaded_files) == 1 and first_name.endswith(".pdf"):
        pdf_bytes = await uploaded_files[0].read()
        try:
            pdf_pages = ocr_service.process_pdf(pdf_bytes)
            for p in pdf_pages:
                pages_output.append({
                    "pageNumber": p["pageNumber"],
                    "filename": f"page_{p['pageNumber']}.jpg",
                    "status": p["ocrStatus"],
                    "extractedText": p["extractedText"],
                    "confirmedText": p["confirmedText"],
                    "confidence": p["confidence"],
                    "width": p["width"],
                    "height": p["height"],
                    "source": p["source"],
                    "error": p.get("error"),
                })
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    else:
        for i, up_file in enumerate(uploaded_files):
            page_num = i + 1
            f_bytes = await up_file.read()
            fname = getattr(up_file, "filename", f"page_{page_num}.jpg")
            res = ocr_service.ocr_image_bytes(f_bytes, fname)
            pages_output.append({
                "pageNumber": page_num,
                "filename": fname,
                "fileName": fname,
                "status": res["status"],
                "extractedText": res["text"],
                "confirmedText": res["text"],
                "confidence": res["confidence"],
                "width": res["width"],
                "height": res["height"],
                "source": "IMAGE",
                "error": res.get("error"),
            })

    total_text = "\n\n".join(p["extractedText"] for p in pages_output if p["extractedText"]).strip()
    return {
        "success": True,
        "pageCount": len(pages_output),
        "totalPages": len(pages_output),
        "totalText": total_text,
        "pages": pages_output,
    }


@submissions_router.post("/classes/{class_id}/assignments/{assignment_id}/submissions", status_code=status.HTTP_201_CREATED)
async def submit_assignment(
    class_id: str,
    assignment_id: str,
    request: Request,
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

    content_type = request.headers.get("content-type", "")
    file_bytes: bytes | None = None
    orig_filename: str | None = None
    content: str | None = None
    is_scan_submission = False
    pages_meta: list[dict[str, Any]] | None = None
    page_files_map: dict[int, tuple[str, bytes]] = {}
    saved_page_keys: list[tuple[int, str, str, str, int, int]] = []
    scanned_pdf_pages: list[dict[str, Any]] | None = None

    if "multipart/form-data" in content_type or "application/x-www-form-urlencoded" in content_type:
        try:
            form = await request.form()
            # Check for scan submission
            if form.get("isScanSubmission") in ("true", "True", "1", True) or form.get("type") == "SCAN":
                is_scan_submission = True
                raw_meta = form.get("pages_meta")
                if raw_meta and isinstance(raw_meta, str):
                    try:
                        pages_meta = json.loads(raw_meta)
                    except Exception as pe:
                        logger.warning(f"Error parsing pages_meta JSON: {pe}")

                for key, val in form.multi_items():
                    if key.startswith("page_file_") and hasattr(val, "read"):
                        try:
                            p_num = int(key.replace("page_file_", ""))
                            f_name = getattr(val, "filename", f"page_{p_num}.jpg")
                            p_read = val.read()
                            p_bytes = await p_read if inspect.isawaitable(p_read) else p_read
                            page_files_map[p_num] = (f_name, p_bytes)
                        except Exception as pfe:
                            logger.warning(f"Failed to read {key}: {pfe}")
                    elif key in ("page_files", "files") and hasattr(val, "read"):
                        p_num = len(page_files_map) + 1
                        f_name = getattr(val, "filename", f"page_{p_num}.jpg")
                        p_read = val.read()
                        p_bytes = await p_read if inspect.isawaitable(p_read) else p_read
                        page_files_map[p_num] = (f_name, p_bytes)

            uploaded_file = form.get("file")
            if uploaded_file is not None and (
                isinstance(uploaded_file, UploadFile)
                or hasattr(uploaded_file, "filename")
                or hasattr(uploaded_file, "read")
            ):
                fname = getattr(uploaded_file, "filename", None)
                if fname:
                    orig_filename = fname
                    if hasattr(uploaded_file, "read"):
                        read_res = uploaded_file.read()
                        if inspect.isawaitable(read_res):
                            file_bytes = await read_res
                        else:
                            file_bytes = read_res
            raw_content = form.get("content")
            if isinstance(raw_content, str) and raw_content.strip():
                content = raw_content.strip()
        except Exception as e:
            logger.warning(f"Error parsing form data: {e}")

    if not is_scan_submission and content is None and not file_bytes:
        try:
            body = await request.json()
            if isinstance(body, dict):
                raw_content = body.get("content")
                if isinstance(raw_content, str) and raw_content.strip():
                    content = raw_content.strip()
        except Exception:
            content = None

    sub_type = SubmissionType.TEXT
    file_url = None
    file_name = None
    extracted_content: str = ""
    raw_ocr_text: str | None = None
    is_edited_flag = False
    ocr_status_val = "NONE"
    page_count_val = 1

    # PATH A: Multi-page scan submission
    if is_scan_submission:
        if not assignment.allowScan and assignment.submissionType not in (SubmissionType.ANY, SubmissionType.SCAN):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Penugasan ini tidak mengizinkan pengumpulan via Scan/Foto.",
            )

        if not pages_meta or len(pages_meta) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Metadata halaman scan kosong atau tidak valid.",
            )

        if len(pages_meta) > MAX_PAGES_ALLOWED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Jumlah halaman scan ({len(pages_meta)}) melebihi batas maksimum {MAX_PAGES_ALLOWED} halaman.",
            )

        # Sort pages_meta by pageNumber
        pages_meta = sorted(pages_meta, key=lambda x: int(x.get("pageNumber", 0)))

        # Validate that each page has its image file
        page_images_bytes: list[bytes] = []
        for p in pages_meta:
            p_num = int(p.get("pageNumber", 0))
            if p_num not in page_files_map or len(page_files_map[p_num][1]) == 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"File gambar untuk halaman {p_num} belum lengkap atau kosong.",
                )
            img_b = page_files_map[p_num][1]
            try:
                pil_img = ocr_service.validate_and_load_image(img_b)
                p["width"] = pil_img.width
                p["height"] = pil_img.height
            except Exception as ve:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Halaman {p_num}: {ve!s}",
                )
            page_images_bytes.append(img_b)

        # Combine page images into a single archival PDF document
        try:
            combined_pdf_bytes = ocr_service.assemble_pdf_from_images(page_images_bytes)
        except Exception as ce:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Gagal menggabungkan gambar halaman menjadi PDF: {ce}",
            )

        confirmed_text = "\n\n".join(
            p.get("confirmedText", "").strip() for p in pages_meta if p.get("confirmedText", "").strip()
        ).strip()
        raw_ocr = "\n\n".join(
            p.get("extractedText", "").strip() for p in pages_meta if p.get("extractedText", "").strip()
        ).strip()

        if not confirmed_text:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Teks jawaban hasil scan terkonfirmasi tidak boleh kosong.",
            )

        sub_type = SubmissionType.SCAN
        extracted_content = confirmed_text
        raw_ocr_text = raw_ocr
        is_edited_flag = (confirmed_text != raw_ocr)
        ocr_status_val = "SUCCESS" if any(p.get("status") == "SUCCESS" for p in pages_meta) else "EMPTY"
        page_count_val = len(pages_meta)

        # Save combined PDF
        saved_obj_key = storage.save_sync(f"submission_scan_{assignment_id}.pdf", combined_pdf_bytes)
        file_url = saved_obj_key
        file_name = "jawaban_scan.pdf"

        # Save individual page images
        for p in pages_meta:
            p_num = int(p.get("pageNumber", 0))
            orig_p_name, p_bytes = page_files_map[p_num]
            p_ext = "jpg"
            p_storage_key = storage.save_sync(f"page_{p_num}_{p_ext}", p_bytes)
            saved_page_keys.append((p_num, p_storage_key, orig_p_name, "image/jpeg", p.get("width", 0), p.get("height", 0)))

    # PATH B: Single file upload (PDF or DOCX)
    elif file_bytes is not None:
        if len(file_bytes) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File yang diunggah kosong",
            )
        if len(file_bytes) > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ukuran file melebihi batas maksimum 10MB",
            )

        orig_lower = orig_filename.lower() if orig_filename else ""
        if orig_lower.endswith(".pdf"):
            sub_type = SubmissionType.PDF
        elif orig_lower.endswith(".docx"):
            sub_type = SubmissionType.DOCX
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Format file tidak didukung. Harap unggah file .pdf atau .docx",
            )

        if assignment.submissionType == SubmissionType.TEXT:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tugas ini hanya menerima pengumpulan jawaban teks",
            )
        if assignment.submissionType != SubmissionType.ANY and assignment.submissionType != sub_type:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Tugas ini hanya menerima format {assignment.submissionType.value}",
            )

        # Validate format and extract text BEFORE saving to storage
        try:
            extracted_content = extract_text_from_buffer(file_bytes, sub_type.value)
        except EmptyExtractedTextError:
            # Scanned PDF fallback: try OCR across PDF pages
            if sub_type == SubmissionType.PDF:
                try:
                    pdf_pages = ocr_service.process_pdf(file_bytes)
                    extracted_content = "\n\n".join(
                        p["extractedText"] for p in pdf_pages if p["extractedText"]
                    ).strip()
                    if not extracted_content:
                        raise EmptyExtractedTextError("Dokumen PDF scan tidak memuat teks yang dapat diekstrak atau dinilai.")
                    scanned_pdf_pages = pdf_pages
                    raw_ocr_text = extracted_content
                    ocr_status_val = "SUCCESS"
                    page_count_val = len(pdf_pages)
                except Exception as ocr_err:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ocr_err))
            else:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Dokumen tidak memuat teks yang dapat diekstrak atau dinilai")
        except InvalidFormatError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
        except CorruptDocumentError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Gagal memproses dokumen: {e!s}",
            )

        if not extracted_content or not extracted_content.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Dokumen tidak memuat teks yang dapat diekstrak atau dinilai",
            )

        saved_obj_key = storage.save_sync(orig_filename or "document.pdf", file_bytes)
        file_url = saved_obj_key
        file_name = orig_filename

        # If scanned PDF pages rendered, save rendered page preview images
        if scanned_pdf_pages:
            for p in scanned_pdf_pages:
                p_num = p["pageNumber"]
                p_img_bytes = p.get("imageBytes")
                if p_img_bytes:
                    p_storage_key = storage.save_sync(f"pdf_page_{p_num}.jpg", p_img_bytes)
                    saved_page_keys.append((p_num, p_storage_key, f"page_{p_num}.jpg", "image/jpeg", p.get("width", 0), p.get("height", 0)))

    # PATH C: Text-only submission
    else:
        if not content or not content.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Harap unggah file atau masukkan teks jawaban",
            )
        if assignment.submissionType == SubmissionType.PDF:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tugas ini memerlukan pengumpulan berupa file PDF",
            )
        if assignment.submissionType == SubmissionType.DOCX:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tugas ini memerlukan pengumpulan berupa file DOCX",
            )
        if len(content.encode("utf-8")) > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ukuran teks jawaban melebihi batas maksimum 10MB",
            )
        sub_type = SubmissionType.TEXT
        extracted_content = content.strip()
        saved_obj_key = None

    try:
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
            rawOcrText=raw_ocr_text,
            isEdited=is_edited_flag,
            ocrStatus=ocr_status_val,
            pageCount=page_count_val,
        )
        db.add(sub_version)
        db.commit()
        db.refresh(sub_version)

        # Create SubmissionPage records if present
        if is_scan_submission and pages_meta:
            page_meta_by_num = {int(p.get("pageNumber", 0)): p for p in pages_meta}
            for p_num, p_key, p_fname, p_mime, p_w, p_h in saved_page_keys:
                pm = page_meta_by_num.get(p_num, {})
                page_rec = SubmissionPage(
                    submissionVersionId=sub_version.id,
                    pageNumber=p_num,
                    imageUrl=p_key,
                    imageName=p_fname,
                    mimeType=p_mime,
                    width=p_w,
                    height=p_h,
                    extractedText=pm.get("extractedText"),
                    confirmedText=pm.get("confirmedText"),
                    ocrStatus=pm.get("status", "SUCCESS"),
                    ocrError=pm.get("error"),
                    source=pm.get("source", "IMAGE"),
                )
                db.add(page_rec)
            db.commit()
        elif scanned_pdf_pages:
            pdf_page_by_num = {p["pageNumber"]: p for p in scanned_pdf_pages}
            for p_num, p_key, p_fname, p_mime, p_w, p_h in saved_page_keys:
                pm = pdf_page_by_num.get(p_num, {})
                page_rec = SubmissionPage(
                    submissionVersionId=sub_version.id,
                    pageNumber=p_num,
                    imageUrl=p_key,
                    imageName=p_fname,
                    mimeType=p_mime,
                    width=p_w,
                    height=p_h,
                    extractedText=pm.get("extractedText"),
                    confirmedText=pm.get("confirmedText"),
                    ocrStatus=pm.get("ocrStatus", "SUCCESS"),
                    ocrError=pm.get("error"),
                    source=pm.get("source", "PDF_IMAGE_PAGE"),
                )
                db.add(page_rec)
            db.commit()

        submission.activeVersionId = sub_version.id
        db.commit()
    except Exception as e:
        db.rollback()
        if saved_obj_key:
            storage.delete_sync(saved_obj_key)
        for _, p_key, _, _, _, _ in saved_page_keys:
            try:
                storage.delete_sync(p_key)
            except Exception:
                pass
        logger.error(f"Failed to record submission version: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Gagal menyimpan pengumpulan tugas ke database",
        ) from e

    return {
        "success": True,
        "id": submission.id,
        "submissionId": submission.id,
        "userId": submission.mahasiswaId,
        "versionId": sub_version.id,
        "versionNumber": sub_version.versionNumber,
        "type": sub_version.type.value,
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
        # Students only ever see the currently released grade, never superseded/withdrawn ones.
        if is_privileged or (g.status == "RELEASED" and g.id == sub.releasedGradeId):
            grade_item: dict[str, Any] = {
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
            }
            if is_privileged:
                grade_item["evaluationRunId"] = g.evaluationRunId
                grade_item["perCriterionFinal"] = g.perCriterionFinal
                grade_item["changeReason"] = g.changeReason
            else:
                grade_item["criteria"] = [
                    {"criterionId": p.get("criterionId"), "finalScore": p.get("finalScore"), "finalFeedback": p.get("finalFeedback")}
                    for p in (g.perCriterionFinal or [])
                ]
            grades_data.append(grade_item)

    # Relationship is ordered newest first.
    evals_data = [_serialize_evaluation(ev) for ev in sub.evaluations] if is_privileged else []

    versions_data = [
        {
            "id": v.id,
            "submissionId": v.submissionId,
            "versionNumber": v.versionNumber,
            "type": v.type.value if hasattr(v.type, "value") else str(v.type),
            "content": v.content,
            "fileUrl": v.fileUrl,
            "fileName": v.fileName,
            "rawOcrText": v.rawOcrText,
            "isEdited": v.isEdited,
            "ocrStatus": v.ocrStatus,
            "pageCount": v.pageCount,
            "pages": [
                {
                    "id": p.id,
                    "pageNumber": p.pageNumber,
                    "imageName": p.imageName,
                    "imageUrl": p.imageUrl,
                    "mimeType": p.mimeType,
                    "width": p.width,
                    "height": p.height,
                    "extractedText": p.extractedText,
                    "confirmedText": p.confirmedText,
                    "ocrStatus": p.ocrStatus,
                    "ocrError": p.ocrError,
                    "source": p.source,
                }
                for p in (v.pages or [])
            ],
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

    active_version_obj = next((v for v in versions_data if v["id"] == sub.activeVersionId), None)

    return {
        "id": sub.id,
        "assignmentId": sub.assignmentId,
        "userId": sub.mahasiswaId,
        "activeVersionId": sub.activeVersionId,
        "activeVersion": active_version_obj,
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
            "allowScan": sub.assignment.allowScan,
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
def retrieve_relevant_chunks(
    db: Session,
    assignment_id: str,
    query_vector: list[float],
    model: str = "nomic-embed-text",
    dimension: int = 768,
    top_k: int = 5,
) -> list[dict[str, Any]]:
    vec_str = "[" + ",".join(str(x) for x in query_vector) + "]"
    sql = text("""
        SELECT
            ce."chunkId",
            ce."documentVersionId",
            dc."chunkIndex",
            dc."rawText",
            dc."locator",
            dv."originalName",
            dv."documentId",
            1.0 - (ce.embedding <=> CAST(:vec AS vector)) as similarity
        FROM chunk_embeddings ce
        JOIN document_chunks dc ON dc.id = ce."chunkId"
        JOIN document_versions dv ON dv.id = ce."documentVersionId"
        JOIN documents d ON d.id = dv."documentId"
        WHERE d."assignmentId" = :assignment_id
          AND dv."extractionStatus" = 'APPROVED'
          AND ce.state = 'READY'
          AND ce.model = :model
          AND ce.dimension = :dimension
        ORDER BY ce.embedding <=> CAST(:vec AS vector) ASC
        LIMIT :top_k
    """)
    rows = db.execute(sql, {
        "vec": vec_str,
        "assignment_id": assignment_id,
        "model": model,
        "dimension": dimension,
        "top_k": top_k,
    }).fetchall()
    results = []
    for r in rows:
        results.append({
            "chunkId": r[0],
            "documentVersionId": r[1],
            "chunkIndex": r[2],
            "text": r[3],
            "rawText": r[3],
            "locator": r[4],
            "documentName": r[5] or "Dokumen Acuan",
            "documentId": r[6],
            "similarity": round(float(r[7]), 4),
        })
    return results


class _GradingContext:
    """Everything the AI grader needs, detached from the request-scoped session."""

    def __init__(self, sub: Submission, active_ver: SubmissionVersion):
        assignment = sub.assignment
        self.submission_id: str = sub.id
        self.assignment_id: str = sub.assignmentId
        self.version_id: str = active_ver.id
        self.content: str = active_ver.content or ""
        self.title: str = assignment.title
        self.instructions: str = assignment.instructions
        self.max_score: float = float(assignment.maxScore)
        self.student_names: list[str] = [sub.user.name] if sub.user and sub.user.name else []
        self.criteria: list[dict[str, Any]] = [
            {
                "id": cr.id,
                "label": cr.label,
                "description": cr.description,
                "maxScore": cr.maxScore,
                "weight": cr.weight,
                "expectedAnswer": cr.expectedAnswer,
                "answerKey": cr.answerKey,
                "material": cr.material,
            }
            for cr in assignment.rubric.criteria
        ]
        self.rubric_snapshot: dict[str, Any] = {
            "rubricId": assignment.rubric.id,
            "title": assignment.rubric.title,
            "criteria": [
                {k: c[k] for k in ("id", "label", "description", "maxScore", "weight")} for c in self.criteria
            ],
        }


def _load_gradable_submission(submission_id: str, current_user: User, db: Session) -> _GradingContext:
    """Shared validation for POST /grade and GET /grade/stream."""
    if current_user.role != Role.DOSEN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Hanya dosen yang dapat menjalankan penilaian AI")

    sub = db.query(Submission).filter(Submission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pengumpulan tugas tidak ditemukan")
    if sub.assignment.class_.dosenId != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Anda bukan pengajar kelas ini")

    active_ver = db.query(SubmissionVersion).filter(SubmissionVersion.id == sub.activeVersionId).first()
    if not active_ver:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Versi aktif tugas tidak ditemukan")
    if not (active_ver.content or "").strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Teks jawaban mahasiswa kosong")

    if not sub.assignment.rubric or not sub.assignment.rubric.criteria:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tugas belum memiliki rubrik penilaian. Evaluasi AI memerlukan rubrik dengan kriteria penilaian.",
        )
    return _GradingContext(sub, active_ver)


async def _reference_evidence(ctx: _GradingContext) -> list[dict[str, Any]]:
    """Top chunks from the lecturer's approved reference documents (optional context)."""
    try:
        emb = await generate_embedding_result(ctx.content)
        with SessionLocal() as query_db:
            return retrieve_relevant_chunks(
                db=query_db,
                assignment_id=ctx.assignment_id,
                query_vector=emb.vector,
                model=emb.model,
                dimension=emb.dimension,
                top_k=5,
            )
    except Exception as e:
        logger.warning(f"Could not retrieve reference document evidence: {e}")
        return []


async def _run_evaluation(ctx: _GradingContext, reference_blocks: list[dict[str, Any]]) -> dict[str, Any]:
    return await evaluate_submission(
        assignment_title=ctx.title,
        assignment_instructions=ctx.instructions,
        assignment_max_score=ctx.max_score,
        criteria=ctx.criteria,
        student_answer=ctx.content,
        evidence_blocks=reference_blocks,
        student_names=ctx.student_names,
    )


def _save_evaluation(
    ctx: _GradingContext,
    result: dict[str, Any],
    reference_blocks: list[dict[str, Any]],
    db: Session | None = None,
) -> dict[str, Any]:
    """Persist a successful draft. Failed runs are never stored."""
    if db is not None:
        return _persist_evaluation(db, ctx, result, reference_blocks)
    with SessionLocal() as tx_db:
        return _persist_evaluation(tx_db, ctx, result, reference_blocks)


def _persist_evaluation(
    tx_db: Session, ctx: _GradingContext, result: dict[str, Any], reference_blocks: list[dict[str, Any]]
) -> dict[str, Any]:
    ev_run = EvaluationRun(
        submissionId=ctx.submission_id,
        versionId=ctx.version_id,
        rubricVersionSnapshot=ctx.rubric_snapshot,
        rawModelOutput=result["rawOutput"],
        perCriterionScore=result["response"]["perCriterion"],
        suggestedTotalScore=result["response"]["suggestedTotalScore"],
        suggestedFeedback=result["response"]["suggestedFeedback"],
        tokenUsage=result["tokenUsage"],
        status=result.get("status", "COMPLETED"),
        evidence=reference_blocks,
        evaluatorConfig=result.get("evaluatorConfig"),
    )
    tx_db.add(ev_run)
    tx_db.commit()
    tx_db.refresh(ev_run)
    return _serialize_evaluation(ev_run)


def _serialize_evaluation(ev: EvaluationRun) -> dict[str, Any]:
    return {
        "id": ev.id,
        "submissionId": ev.submissionId,
        "versionId": ev.versionId,
        "perCriterionScore": ev.perCriterionScore,
        "suggestedTotalScore": ev.suggestedTotalScore,
        "suggestedFeedback": ev.suggestedFeedback,
        "tokenUsage": ev.tokenUsage,
        "status": ev.status,
        "evidence": ev.evidence,
        "evaluatorConfig": ev.evaluatorConfig,
        "rubricVersionSnapshot": ev.rubricVersionSnapshot,
        "createdAt": ev.createdAt.isoformat() if ev.createdAt else None,
    }


@submissions_router.post("/submissions/{submission_id}/grade")
async def grade_submission_endpoint(
    submission_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ctx = _load_gradable_submission(submission_id, current_user, db)
    reference_blocks = await _reference_evidence(ctx)
    try:
        result = await _run_evaluation(ctx, reference_blocks)
    except EvaluationFailedError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Draf AI tidak dapat dibuat: {e}",
        ) from e

    return {"success": True, "aiEvaluation": _save_evaluation(ctx, result, reference_blocks, db)}


SSE_KEEPALIVE_SECONDS = 8.0


def _sse(event: str, payload: dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps(payload)}\n\n"


@submissions_router.get("/submissions/{submission_id}/grade/stream")
async def grade_submission_stream(
    submission_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ctx = _load_gradable_submission(submission_id, current_user, db)

    def step(n: int, message: str, progress: int) -> str:
        return _sse("status", {"step": n, "totalSteps": 4, "message": message, "progress": progress})

    async def event_generator():
        task: asyncio.Task | None = None
        try:
            yield step(1, "Menyiapkan rubrik dan jawaban mahasiswa…", 10)

            yield step(2, "Mencari bagian jawaban yang relevan per kriteria…", 25)
            reference_blocks = await _reference_evidence(ctx)
            if await request.is_disconnected():
                return

            yield step(3, "Model menyusun draf penilaian per kriteria…", 40)
            task = asyncio.create_task(_run_evaluation(ctx, reference_blocks))
            while True:
                done, _ = await asyncio.wait({task}, timeout=SSE_KEEPALIVE_SECONDS)
                if done:
                    break
                if await request.is_disconnected():
                    task.cancel()
                    return
                # Comment line keeps proxies/EventSource from timing out during long local inference.
                yield ": keep-alive\n\n"

            result = task.result()

            yield step(4, "Menyimpan draf untuk ditinjau dosen…", 90)
            payload = _save_evaluation(ctx, result, reference_blocks)
            yield _sse("done", {"success": True, "aiEvaluation": payload})
        except EvaluationFailedError as e:
            yield _sse("error", {"success": False, "message": f"Draf AI tidak dapat dibuat: {e}"})
        except asyncio.CancelledError:
            if task is not None:
                task.cancel()
            raise
        except Exception as e:
            logger.error(f"Error during AI grading stream: {e}", exc_info=e)
            yield _sse("error", {"success": False, "message": "Terjadi kesalahan saat menyusun draf AI."})

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


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

    max_score = float(sub.assignment.maxScore)
    final_score = float(req.finalScore)
    per_criterion_final: list[dict[str, Any]] | None = None

    if req.evaluationRunId:
        ev_run = (
            db.query(EvaluationRun)
            .filter(EvaluationRun.id == req.evaluationRunId, EvaluationRun.submissionId == submission_id)
            .first()
        )
        if not ev_run:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Draf AI yang dirujuk tidak ditemukan untuk tugas ini")

    if req.perCriterion:
        rubric = sub.assignment.rubric
        if not rubric or not rubric.criteria:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tugas tidak memiliki rubrik; kirim nilai total saja")
        criteria_by_id = {cr.id: cr for cr in rubric.criteria}
        seen: set[str] = set()
        for item in req.perCriterion:
            cr = criteria_by_id.get(item.criterionId)
            if cr is None:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Kriteria {item.criterionId} bukan bagian dari rubrik tugas ini")
            if item.criterionId in seen:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Kriteria '{cr.label}' dikirim lebih dari sekali")
            seen.add(item.criterionId)
            if item.finalScore > cr.maxScore:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Skor kriteria '{cr.label}' tidak boleh melebihi {cr.maxScore}",
                )
        missing = [cr.label for cr in rubric.criteria if cr.id not in seen]
        if missing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Skor final belum diisi untuk: {', '.join(missing)}")

        per_criterion_final = [item.model_dump() for item in req.perCriterion]
        # The server, not the client, decides the weighted total.
        final_score = weighted_total(
            [{"criterionId": p["criterionId"], "score": p["finalScore"]} for p in per_criterion_final],
            [{"id": cr.id, "maxScore": cr.maxScore, "weight": cr.weight} for cr in rubric.criteria],
            max_score,
        )

    if final_score > max_score:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Skor tidak boleh melebihi skor maksimal tugas ({sub.assignment.maxScore})",
        )

    edited_from_ai = req.editedFromAI
    if per_criterion_final is not None:
        edited_from_ai = edited_from_ai or any(p["decision"] in ("edited", "rejected") for p in per_criterion_final)

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

    new_grade = GradeRevision(
        submissionId=submission_id,
        versionId=req.expectedSubmissionVersionId,
        status="RELEASED",
        finalScore=final_score,
        finalFeedback=req.finalFeedback,
        isAIAssisted=req.isAIAssisted or bool(req.evaluationRunId),
        editedFromAI=edited_from_ai,
        gradedById=current_user.id,
        evaluationRunId=req.evaluationRunId,
        perCriterionFinal=per_criterion_final,
        changeReason=req.changeReason,
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
            "evaluationRunId": new_grade.evaluationRunId,
            "perCriterionFinal": new_grade.perCriterionFinal,
            "changeReason": new_grade.changeReason,
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
    versionId: str | None = None,
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
    media_type = "application/pdf" if ver.type in (SubmissionType.PDF, SubmissionType.SCAN) else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

    return Response(
        content=file_bytes,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{ver.fileName or "jawaban"}"'},
    )


@submissions_router.get("/submissions/{submission_id}/pages/{page_number}/image")
async def get_submission_page_image(
    submission_id: str,
    page_number: int,
    versionId: str | None = None,
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
    page = (
        db.query(SubmissionPage)
        .filter(SubmissionPage.submissionVersionId == ver_id, SubmissionPage.pageNumber == page_number)
        .first()
    )
    if not page or not page.imageUrl:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Halaman gambar tidak ditemukan")

    file_bytes = storage.get_sync(page.imageUrl)
    media_type = page.mimeType or "image/jpeg"

    return Response(
        content=file_bytes,
        media_type=media_type,
        headers={"Content-Disposition": f'inline; filename="{page.imageName or f"page_{page_number}.jpg"}"'},
    )

