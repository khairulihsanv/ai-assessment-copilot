import logging
from typing import Literal

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.enums import AssignmentStatus, Role
from app.models.models import Assignment, Class, Enrollment, User
from app.security.dependencies import RateLimiter, get_current_user
from app.services.extractor_service import extract_text_from_buffer
from app.services.study_service import answer_study

ai_router = APIRouter(prefix="/ai", tags=["ai"])


@ai_router.post("/extract-text")
async def extract_text_endpoint(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    if not file or not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="File tidak ditemukan"
        )

    name_lower = file.filename.lower()
    file_type = None
    if name_lower.endswith(".pdf"):
        file_type = "PDF"
    elif name_lower.endswith(".docx"):
        file_type = "DOCX"
    elif name_lower.endswith(".txt"):
        file_type = "TXT"
    elif name_lower.endswith(".pptx"):
        file_type = "PPTX"
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tipe file tidak didukung. Harap unggah PDF, DOCX, TXT, atau PPTX.",
        )

    file_bytes = await file.read()
    if len(file_bytes) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ukuran file terlalu besar. Maksimal 10MB.",
        )

    try:
        text = extract_text_from_buffer(file_bytes, file_type)
        return {"success": True, "text": text}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Gagal mengekstrak teks: {str(e)}",
        )


@ai_router.post("/test")
async def ai_test_endpoint(current_user: User = Depends(get_current_user)):
    return {
        "status": "ok",
        "groq_configured": bool(settings.GROQ_API_KEY),
        "ollama_url": settings.OLLAMA_BASE_URL,
        "default_model": (
            settings.GROQ_MODEL if settings.GROQ_API_KEY else settings.OLLAMA_MODEL
        ),
    }


study_rate_limiter = RateLimiter(max_requests=10, window_seconds=60)
study_logger = logging.getLogger("dexa.study")


class StudyMessage(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


class StudyRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    messages: list[StudyMessage] = Field(min_length=1, max_length=12)
    assignmentId: str | None = Field(default=None, min_length=1, max_length=128)

    @field_validator("messages")
    @classmethod
    def last_message_is_user(cls, messages):
        if messages[-1].role != "user":
            raise ValueError("Pesan terakhir harus dari pengguna")
        return messages


def public_assignment_context(assignment: Assignment) -> dict:
    # Only public fields enter the prompt; keys and student submissions stay private.
    return {
        "title": assignment.title,
        "instructions": (assignment.instructions or "")[:12000],
        "criteria": (
            [
                {
                    "label": c.label,
                    "description": (c.description or "")[:1200],
                    "weight": c.weight,
                    "maxScore": c.maxScore,
                }
                for c in assignment.rubric.criteria[:30]
            ]
            if assignment.rubric
            else []
        ),
    }


@ai_router.post("/study")
async def study_chat(
    body: StudyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    context = None
    if body.assignmentId:
        query = (
            db.query(Assignment)
            .join(Class, Class.id == Assignment.classId)
            .filter(Assignment.id == body.assignmentId)
        )
        if current_user.role == Role.DOSEN:
            query = query.filter(Class.dosenId == current_user.id)
        else:
            query = query.join(Enrollment, Enrollment.classId == Class.id).filter(
                Enrollment.mahasiswaId == current_user.id,
                Assignment.status == AssignmentStatus.PUBLISHED,
            )
        assignment = query.first()
        if not assignment:
            raise HTTPException(
                status_code=404,
                detail="Tugas tidak ditemukan atau Anda tidak memiliki akses.",
            )
        context = public_assignment_context(assignment)
    if not study_rate_limiter.is_allowed(current_user.id):
        raise HTTPException(
            status_code=429,
            detail="Terlalu banyak pertanyaan. Coba lagi dalam satu menit.",
        )
    try:
        answer = await answer_study([m.model_dump() for m in body.messages], context)
    except Exception as exc:
        # Log only the exception type: provider bodies may include private prompts.
        study_logger.warning("Study provider unavailable: %s", type(exc).__name__)
        raise HTTPException(
            status_code=503,
            detail="Study Copilot belum dapat terhubung ke layanan AI. Coba lagi nanti atau hubungi pengelola kelas.",
        ) from exc
    return {"answer": answer, "assignmentId": body.assignmentId}
