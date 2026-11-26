"""Scan → OCR: turn page images into text once, at submission time.

    photo / scanned PDF
        │
        ├─ PDF page with a text layer ──────────────► text as is (no OCR, no tokens)
        │
        ├─ RapidOCR (local, free) ──── good read ───► text
        │                          └── poor read ───┐
        └─ vision model (Groq / Ollama) ◄───────────┘  (OCR_ENGINE=auto, or always with =vision)

The text is what the student checks and corrects, what is stored, and what every
later AI draft reads. Grading never sends images to the model, so a page costs vision
tokens at most once, no matter how often the lecturer regenerates a draft.

RapidOCR is CPU-bound, so it runs in a worker thread: the server keeps answering other
requests while a scan is being read.
"""

from __future__ import annotations

import logging
from typing import Any

from starlette.concurrency import run_in_threadpool

from app.config import settings
from app.services import vision_ocr
from app.services.ocr_service import ocr_service

logger = logging.getLogger(__name__)

ENGINE_RAPIDOCR = "rapidocr"


def _vision_engine_label() -> str:
    return f"vision:{vision_ocr.model_name()}"


def _needs_vision(result: dict[str, Any] | None) -> bool:
    if not vision_ocr.is_configured():
        return False
    if settings.OCR_ENGINE == "vision":
        return True
    if settings.OCR_ENGINE != "auto" or result is None:
        return False
    if result.get("status") == "FAILED" and not result.get("width"):
        return False  # the file itself was rejected (format, size): a vision model cannot help
    return result.get("status") != "SUCCESS" or float(result.get("confidence") or 0.0) < settings.OCR_VISION_MIN_CONFIDENCE


async def _vision_result(image_bytes: bytes, fallback: dict[str, Any] | None) -> dict[str, Any] | None:
    try:
        transcript = await vision_ocr.transcribe(image_bytes)
    except vision_ocr.VisionOCRError as exc:
        logger.warning("Vision OCR failed, keeping RapidOCR result: %s", exc)
        if fallback is not None and fallback.get("status") != "SUCCESS":
            fallback["error"] = f"{fallback.get('error') or 'Teks sulit dibaca.'} Model vision juga gagal: {exc}"
        return None
    if not transcript.text.strip():
        return None
    base = fallback or {}
    return {
        "status": "SUCCESS",
        "text": transcript.text,
        "lines": [],
        # A vision model gives no per-line confidence; the student checks every page anyway.
        "confidence": 0.0,
        "width": base.get("width", 0),
        "height": base.get("height", 0),
        "error": None,
        "engine": _vision_engine_label(),
        "tokens": transcript.prompt_tokens + transcript.completion_tokens,
    }


async def read_image(image_bytes: bytes, filename: str = "page.jpg") -> dict[str, Any]:
    """OCR one page image. Same shape as ``OCRService.ocr_image_bytes`` plus ``engine``/``tokens``."""
    if settings.OCR_ENGINE == "vision" and vision_ocr.is_configured():
        # Still validate format and size locally before spending tokens.
        try:
            img = await run_in_threadpool(ocr_service.validate_and_load_image, image_bytes)
        except Exception as exc:
            return {"status": "FAILED", "text": "", "lines": [], "confidence": 0.0, "width": 0, "height": 0,
                    "error": str(exc), "engine": _vision_engine_label(), "tokens": 0}
        size = {"width": img.width, "height": img.height, "status": "EMPTY"}
        vision = await _vision_result(image_bytes, size)
        if vision is not None:
            return vision
        # Vision failed: fall back to the local engine rather than leave the page blank.

    result = await run_in_threadpool(ocr_service.ocr_image_bytes, image_bytes, filename)
    result["engine"] = ENGINE_RAPIDOCR
    result["tokens"] = 0
    if settings.OCR_ENGINE == "auto" and _needs_vision(result):
        vision = await _vision_result(image_bytes, result)
        if vision is not None:
            return vision
    return result


async def read_pdf(pdf_bytes: bytes) -> list[dict[str, Any]]:
    """Text-layer pages as is; image pages through RapidOCR, and the vision model when needed."""
    pages = await run_in_threadpool(ocr_service.process_pdf, pdf_bytes)
    for page in pages:
        page.setdefault("engine", "pdf-text" if page.get("source") == "PDF_TEXT_PAGE" else ENGINE_RAPIDOCR)
        page.setdefault("tokens", 0)
        if page.get("source") != "PDF_IMAGE_PAGE" or not page.get("imageBytes"):
            continue
        as_result = {
            "status": page.get("ocrStatus"),
            "confidence": page.get("confidence"),
            "width": page.get("width"),
            "height": page.get("height"),
            "error": page.get("error"),
        }
        if not _needs_vision(as_result):
            continue
        vision = await _vision_result(page["imageBytes"], as_result)
        if vision is None:
            page["error"] = as_result.get("error")
            continue
        page.update({
            "ocrStatus": "SUCCESS",
            "extractedText": vision["text"],
            "confirmedText": vision["text"],
            "confidence": 0.0,
            "error": None,
            "engine": vision["engine"],
            "tokens": vision["tokens"],
        })
    return pages


def engine_summary() -> dict[str, Any]:
    """What the scan screen tells the student about how pages are read."""
    vision = vision_ocr.is_configured() and settings.OCR_ENGINE in ("vision", "auto")
    return {
        "engine": settings.OCR_ENGINE,
        "vision": vision,
        "visionModel": vision_ocr.model_name() if vision else None,
        "maxPages": settings.SCAN_MAX_PAGES,
        "maxImageMb": settings.SCAN_MAX_IMAGE_MB,
    }
