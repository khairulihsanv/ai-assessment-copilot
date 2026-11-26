import asyncio
import hashlib
import hmac
import inspect
import json
import logging
from datetime import UTC, datetime
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
from sqlalchemy.orm import Session, joinedload, selectinload
from starlette.concurrency import run_in_threadpool

from app.config import settings
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
from app.security.dependencies import get_current_user, get_upload_user
from app.services import grading_jobs
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
    extract_pages_from_pdf,
    extract_text_from_buffer,
)
from app.services import scan_pipeline
from app.services.ocr_service import (
    InvalidImageFormatError,
    detect_image_format,
    max_image_bytes,
    max_pages,
    ocr_service,
)
from app.services.storage_service import content_disposition, storage

logger = logging.getLogger(__name__)

submissions_router = APIRouter(tags=["submissions"])


def _page_ref(user_id: str, assignment_id: str, object_key: str) -> str:
    """A page image stored at scan time, signed so only its owner can submit it for this assignment."""
    sig = hmac.new(
        settings.SECRET_KEY.encode(), f"{user_id}|{assignment_id}|{object_key}".encode(), hashlib.sha256
    ).hexdigest()[:32]
    return f"{object_key}:{sig}"


def _resolve_page_ref(user_id: str, assignment_id: str, ref: str) -> str | None:
    object_key, _, _sig = (ref or "").rpartition(":")
    if not object_key or "/" in object_key or "\\" in object_key or ".." in object_key:
        return None
    return object_key if hmac.compare_digest(_page_ref(user_id, assignment_id, object_key), ref) else None


def _max_upload_bytes() -> int:
    return settings.MAX_FILE_SIZE_MB * 1024 * 1024


@submissions_router.get("/classes/{class_id}/assignments/{assignment_id}/submissions")
def list_submissions(
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

    submissions = (
        query.order_by(Submission.createdAt.desc())
        .options(
            joinedload(Submission.user),
            selectinload(Submission.grades),
            selectinload(Submission.versions).load_only(
                SubmissionVersion.id,
                SubmissionVersion.versionNumber,
                SubmissionVersion.type,
                SubmissionVersion.fileUrl,
                SubmissionVersion.fileName,
                SubmissionVersion.submittedAt,
            ),
            *([selectinload(Submission.evaluations)] if is_privileged else []),
        )
        .all()
    )

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

    if len(uploaded_files) > max_pages():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maksimal {max_pages()} halaman yang dapat diproses sekaligus.",
        )

    # The scan screen may send one page per request so each upload stays small; the page
    # number it sends back keeps the numbering right.
    try:
        first_page_number = max(1, int(str(form.get("pageNumber") or "1")))
    except ValueError:
        first_page_number = 1

    # Validate file size and magic bytes upfront
    file_bytes_list: list[bytes] = []
    for up_file in uploaded_files:
        f_bytes = await up_file.read()
        if len(f_bytes) > max_image_bytes():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File {getattr(up_file, 'filename', '')} melebihi batas {settings.SCAN_MAX_IMAGE_MB}MB per halaman.",
            )
        try:
            detect_image_format(f_bytes)
        except InvalidImageFormatError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File {getattr(up_file, 'filename', '')} bukan gambar atau PDF yang valid.",
            )
        file_bytes_list.append(f_bytes)

    pages_output: list[dict[str, Any]] = []

    first_name = (getattr(uploaded_files[0], "filename", "") or "").lower()
    if len(uploaded_files) == 1 and first_name.endswith(".pdf"):
        try:
            pdf_pages = await scan_pipeline.read_pdf(file_bytes_list[0])
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
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
                "engine": p.get("engine"),
                "tokens": p.get("tokens", 0),
                "error": p.get("error"),
            })
    else:
        for i, (up_file, f_bytes) in enumerate(zip(uploaded_files, file_bytes_list)):
            page_num = first_page_number + i
            fname = getattr(up_file, "filename", f"page_{page_num}.jpg")
            res = await scan_pipeline.read_image(f_bytes, fname)
            page_ref = None
            if res.get("width"):
                # Keep the image, so the final submission only has to send this reference.
                key = await run_in_threadpool(storage.save_sync, f"scan_page_{page_num}.jpg", f_bytes)
                page_ref = _page_ref(current_user.id, assignment_id, key)
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
                "engine": res.get("engine"),
                "tokens": res.get("tokens", 0),
                "pageRef": page_ref,
                "error": res.get("error"),
            })

    total_text = "\n\n".join(p["extractedText"] for p in pages_output if p["extractedText"]).strip()
    return {
        "success": True,
        "pageCount": len(pages_output),
        "totalPages": len(pages_output),
        "totalText": total_text,
        "pages": pages_output,
        "ocr": scan_pipeline.engine_summary(),
    }


@submissions_router.get("/ocr/config")
def ocr_config(current_user: User = Depends(get_current_user)):
    """Scan limits and how pages are read, for the scan screen."""
    return scan_pipeline.engine_summary()


async def _ocr_image_pages_of_text_pdf(file_bytes: bytes) -> tuple[str, list[dict[str, Any]]] | None:
    """Text of every page, OCR included, when a PDF with a text layer also has image-only pages."""
    try:
        pages = await run_in_threadpool(extract_pages_from_pdf, file_bytes)
    except Exception:
        return None
    blank = [p for p in pages if len((p.get("text") or "").strip()) < 20]
    if not blank or len(pages) > max_pages():
        return None
    try:
        pdf_pages = await scan_pipeline.read_pdf(file_bytes)
    except Exception as exc:
        logger.warning("OCR of image pages in a text PDF failed: %s", exc)
        return None
    if not any(p.get("source") == "PDF_IMAGE_PAGE" and (p.get("extractedText") or "").strip() for p in pdf_pages):
        return None
    text = "\n\n".join(p["extractedText"].strip() for p in pdf_pages if (p.get("extractedText") or "").strip())
    return text, pdf_pages


@submissions_router.post("/classes/{class_id}/assignments/{assignment_id}/submissions", status_code=status.HTTP_201_CREATED)
async def submit_assignment(
    class_id: str,
    assignment_id: str,
    request: Request,
    # Large documents come straight from the browser with an upload ticket (Vercel body limit).
    current_user: User = Depends(get_upload_user),
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

    now = datetime.now(UTC)
    if now > assignment.dueDate and not assignment.allowLateSubmission:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tenggat waktu pengumpulan tugas ini telah berakhir")

    # A released grade belongs to the version the lecturer read. A new version would silently
    # sit under that grade, so it is refused until the lecturer withdraws the release.
    graded = (
        db.query(Submission.id)
        .filter(
            Submission.assignmentId == assignment_id,
            Submission.mahasiswaId == current_user.id,
            Submission.releasedGradeId.isnot(None),
        )
        .first()
    )
    if graded:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Nilai tugas ini sudah dirilis, jadi jawaban tidak bisa diganti. Hubungi dosen bila perlu dibuka kembali.",
        )

    content_type = request.headers.get("content-type", "")
    file_bytes: bytes | None = None
    orig_filename: str | None = None
    content: str | None = None
    is_scan_submission = False
    pages_meta: list[dict[str, Any]] | None = None
    page_files_map: dict[int, tuple[str, bytes]] = {}
    # Pages already stored by the OCR preview: page number -> storage key (reused, not re-saved).
    page_ref_keys: dict[int, str] = {}
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
                    if key.startswith("page_ref_") and isinstance(val, str):
                        try:
                            p_num = int(key.replace("page_ref_", ""))
                        except ValueError:
                            continue
                        object_key = _resolve_page_ref(current_user.id, assignment_id, val)
                        if object_key is None:
                            raise HTTPException(
                                status_code=status.HTTP_400_BAD_REQUEST,
                                detail=f"Referensi gambar halaman {p_num} tidak valid. Pindai ulang halaman tersebut.",
                            )
                        try:
                            p_bytes = await run_in_threadpool(storage.get_sync, object_key)
                        except FileNotFoundError:
                            raise HTTPException(
                                status_code=status.HTTP_400_BAD_REQUEST,
                                detail=f"Gambar halaman {p_num} sudah tidak tersedia. Pindai ulang halaman tersebut.",
                            )
                        page_files_map[p_num] = (f"page_{p_num}.jpg", p_bytes)
                        page_ref_keys[p_num] = object_key
                    elif key.startswith("page_file_") and hasattr(val, "read"):
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
        except HTTPException:
            raise
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

        if len(pages_meta) > max_pages():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Jumlah halaman scan ({len(pages_meta)}) melebihi batas maksimum {max_pages()} halaman.",
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
                pil_img = await run_in_threadpool(ocr_service.validate_and_load_image, img_b)
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
            combined_pdf_bytes = await run_in_threadpool(ocr_service.assemble_pdf_from_images, page_images_bytes)
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
            p_storage_key = page_ref_keys.get(p_num) or storage.save_sync(f"page_{p_num}.jpg", p_bytes)
            saved_page_keys.append((p_num, p_storage_key, orig_p_name, "image/jpeg", p.get("width", 0), p.get("height", 0)))

    # PATH B: Single file upload (PDF or DOCX)
    elif file_bytes is not None:
        if len(file_bytes) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File yang diunggah kosong",
            )
        if len(file_bytes) > _max_upload_bytes():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ukuran file melebihi batas maksimum {settings.MAX_FILE_SIZE_MB}MB",
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
            extracted_content = await run_in_threadpool(extract_text_from_buffer, file_bytes, sub_type.value)
        except EmptyExtractedTextError:
            # Scanned PDF fallback: try OCR across PDF pages
            if sub_type == SubmissionType.PDF:
                try:
                    pdf_pages = await scan_pipeline.read_pdf(file_bytes)
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

        # A typed report with some scanned pages (handwritten working, signed sheets, appendices):
        # the text layer misses those pages, so read them with OCR too.
        if sub_type == SubmissionType.PDF and scanned_pdf_pages is None:
            mixed = await _ocr_image_pages_of_text_pdf(file_bytes)
            if mixed is not None:
                extracted_content, scanned_pdf_pages = mixed
                raw_ocr_text = extracted_content
                ocr_status_val = "SUCCESS"
                page_count_val = len(scanned_pdf_pages)

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
        for p_num, p_key, _, _, _, _ in saved_page_keys:
            if page_ref_keys.get(p_num) == p_key:
                continue  # stored by the OCR preview: keep it so the student can simply retry
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
def get_submission_detail(
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


def _load_owned_submission(submission_id: str, current_user: User, db: Session) -> Submission:
    if current_user.role != Role.DOSEN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Hanya dosen yang dapat menjalankan penilaian AI")

    sub = db.query(Submission).filter(Submission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pengumpulan tugas tidak ditemukan")
    if sub.assignment.class_.dosenId != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Anda bukan pengajar kelas ini")
    return sub


def _load_gradable_submission(submission_id: str, current_user: User, db: Session) -> _GradingContext:
    """Shared validation for POST /grade and GET /grade/stream."""
    sub = _load_owned_submission(submission_id, current_user, db)

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


def _reference_query(ctx: _GradingContext) -> str:
    """What to look up in the lecturer's reference documents: the rubric, not the answer.

    The start of a long report is its cover page and preface, which says nothing about which
    reference passages matter. The rubric does, and it is the same for every student.
    """
    parts = [ctx.title]
    for c in ctx.criteria:
        parts.extend(str(c.get(k) or "") for k in ("label", "description", "expectedAnswer", "answerKey"))
    query = " ".join(p for p in parts if p).strip()
    return query or ctx.content


async def _reference_evidence(ctx: _GradingContext) -> list[dict[str, Any]]:
    """Top chunks from the lecturer's approved reference documents (optional context)."""
    try:
        emb = await generate_embedding_result(_reference_query(ctx))

        def query() -> list[dict[str, Any]]:
            with SessionLocal() as query_db:
                return retrieve_relevant_chunks(
                    db=query_db,
                    assignment_id=ctx.assignment_id,
                    query_vector=emb.vector,
                    model=emb.model,
                    dimension=emb.dimension,
                    top_k=5,
                )

        return await run_in_threadpool(query)
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


SSE_TICK_SECONDS = 2.0
TOKENS_PER_CRITERION_ESTIMATE = 400


def _sse(event: str, payload: dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps(payload)}\n\n"


async def _draft_job(ctx: _GradingContext, job: grading_jobs.GradingJob) -> dict[str, Any]:
    job.set_step(2, "Mencari bagian jawaban yang relevan per kriteria…", 25)
    reference_blocks = await _reference_evidence(ctx)
    job.set_step(3, "Model membaca jawaban dan rubrik…", 40)
    result = await _run_evaluation(ctx, reference_blocks)
    job.set_step(4, "Menyimpan draf untuk ditinjau dosen…", 90)
    return await run_in_threadpool(_save_evaluation, ctx, result, reference_blocks)


@submissions_router.get("/submissions/{submission_id}/grade/stream")
async def grade_submission_stream(
    submission_id: str,
    request: Request,
    attach: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Follow the draft of a submission, starting it unless ``attach`` is set.

    The draft runs as a background job: closing this stream leaves it running, and it is
    saved when it finishes. ``attach`` is for a page that reopens and must not start a run.
    """
    if attach:
        _load_owned_submission(submission_id, current_user, db)
        job = grading_jobs.get(submission_id)
    else:
        ctx = _load_gradable_submission(submission_id, current_user, db)
        job = grading_jobs.start(
            submission_id,
            lambda j: _draft_job(ctx, j),
            expected_tokens=TOKENS_PER_CRITERION_ESTIMATE * len(ctx.criteria),
        )

    async def event_generator():
        if job is None:
            yield _sse("done", {"success": True, "aiEvaluation": None})
            return
        sent = 0
        if attach:
            sent = len(job.history)
            yield _sse("status", job.snapshot())
        while True:
            for frame in job.history[sent:]:
                sent += 1
                yield _sse("status", frame)
            if job.task.done():
                break
            done, _ = await asyncio.wait({job.task}, timeout=SSE_TICK_SECONDS)
            if done:
                continue
            if await request.is_disconnected():
                return
            # Also keeps proxies and EventSource from timing out during long local inference.
            yield _sse("status", job.snapshot())

        if job.state == "done":
            yield _sse("done", {"success": True, "aiEvaluation": job.result})
        elif job.state == "cancelled":
            yield _sse("error", {"success": False, "message": grading_jobs.CANCELLED_MESSAGE})
        else:
            yield _sse("error", {"success": False, "message": f"Draf AI tidak dapat dibuat: {job.error}"})

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@submissions_router.get("/submissions/{submission_id}/grade/job")
async def grade_job_status(
    submission_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """What a reopened review page should show. A finished job is reported once."""
    _load_owned_submission(submission_id, current_user, db)
    job = grading_jobs.get(submission_id)
    if job is None:
        return {"state": "idle"}
    if job.is_running:
        return job.snapshot()
    grading_jobs.forget(submission_id)
    return {
        "state": job.state,
        "error": f"Draf AI tidak dapat dibuat: {job.error}" if job.state == "failed" else None,
    }


@submissions_router.post("/submissions/{submission_id}/grade/cancel")
async def grade_job_cancel(
    submission_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _load_owned_submission(submission_id, current_user, db)
    return {"cancelled": grading_jobs.cancel(submission_id)}


@submissions_router.post("/submissions/{submission_id}/finalize")
def finalize_grade(
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
def revert_finalize_grade(
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
def download_submission_file(
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
    # Access was checked against submission_id, so the version must belong to that submission.
    ver = (
        db.query(SubmissionVersion)
        .filter(SubmissionVersion.id == ver_id, SubmissionVersion.submissionId == sub.id)
        .first()
    )
    if not ver or not ver.fileUrl:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File tidak ditemukan")

    file_bytes = storage.get_sync(ver.fileUrl)
    media_type = "application/pdf" if ver.type in (SubmissionType.PDF, SubmissionType.SCAN) else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

    return Response(
        content=file_bytes,
        media_type=media_type,
        headers={"Content-Disposition": content_disposition("attachment", ver.fileName or "jawaban")},
    )


@submissions_router.get("/submissions/{submission_id}/pages/{page_number}/image")
def get_submission_page_image(
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
        .join(SubmissionVersion, SubmissionVersion.id == SubmissionPage.submissionVersionId)
        .filter(
            SubmissionPage.submissionVersionId == ver_id,
            SubmissionPage.pageNumber == page_number,
            # Same rule as the file download: never a page of another submission.
            SubmissionVersion.submissionId == sub.id,
        )
        .first()
    )
    if not page or not page.imageUrl:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Halaman gambar tidak ditemukan")

    file_bytes = storage.get_sync(page.imageUrl)
    media_type = page.mimeType or "image/jpeg"

    return Response(
        content=file_bytes,
        media_type=media_type,
        headers={"Content-Disposition": content_disposition("inline", page.imageName or f"page_{page_number}.jpg")},
    )

