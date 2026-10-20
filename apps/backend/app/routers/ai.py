from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.config import settings
from app.models.models import User
from app.security.dependencies import get_current_user
from app.services.extractor_service import extract_text_from_buffer

ai_router = APIRouter(prefix="/ai", tags=["ai"])


@ai_router.post("/extract-text")
async def extract_text_endpoint(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    if not file or not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File tidak ditemukan")

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
            detail=f"Gagal mengekstrak teks: {e!s}",
        )


@ai_router.post("/test")
async def ai_test_endpoint(current_user: User = Depends(get_current_user)):
    return {
        "status": "ok",
        "groq_configured": bool(settings.GROQ_API_KEY),
        "ollama_url": settings.OLLAMA_BASE_URL,
        "default_model": settings.GROQ_MODEL if settings.GROQ_API_KEY else settings.OLLAMA_MODEL,
    }
