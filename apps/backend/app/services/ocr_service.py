import io
import logging
from typing import Any

import numpy as np
from PIL import Image, ImageOps

logger = logging.getLogger("dexa-ocr")

# Magic bytes for content validation
JPEG_MAGIC = b"\xff\xd8\xff"
PNG_MAGIC = b"\x89PNG\r\n\x1a\n"
WEBP_RIFF = b"RIFF"
WEBP_MARKER = b"WEBP"
PDF_MAGIC = b"%PDF-"

MAX_IMAGE_DIMENSION = 4096
MIN_IMAGE_DIMENSION = 10
MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024  # 10MB per image
MAX_PAGES_ALLOWED = 15


class OCRError(Exception):
    """Base exception for OCR errors."""


class InvalidImageFormatError(OCRError):
    """Raised when file bytes do not match expected image magic bytes."""


class ImageDimensionError(OCRError):
    """Raised when image dimensions are outside acceptable limits."""


def detect_image_format(content: bytes) -> str:
    """Detect image format by inspecting magic bytes."""
    if not content or len(content) < 8:
        raise InvalidImageFormatError("File gambar kosong atau terlalu kecil.")
    if content.startswith(JPEG_MAGIC):
        return "JPEG"
    if content.startswith(PNG_MAGIC):
        return "PNG"
    if content.startswith(WEBP_RIFF) and len(content) >= 12 and content[8:12] == WEBP_MARKER:
        return "WEBP"
    if content.startswith(PDF_MAGIC):
        return "PDF"
    raise InvalidImageFormatError(
        "Format file tidak didukung. Harap unggah gambar JPG, JPEG, PNG, atau dokumen PDF scan."
    )


class OCRService:
    def __init__(self):
        self._engine = None

    def get_engine(self):
        if self._engine is None:
            logger.info("Initializing RapidOCR engine...")
            from rapidocr_onnxruntime import RapidOCR
            self._engine = RapidOCR()
            logger.info("RapidOCR engine ready.")
        return self._engine

    def validate_and_load_image(self, image_bytes: bytes) -> Image.Image:
        """Validates format magic bytes, dimensions, and converts to RGB PIL Image."""
        if len(image_bytes) > MAX_IMAGE_SIZE_BYTES:
            raise ImageDimensionError("Ukuran gambar melebihi batas maksimum 10MB per halaman.")

        fmt = detect_image_format(image_bytes)
        if fmt not in ("JPEG", "PNG", "WEBP"):
            raise InvalidImageFormatError(f"Format {fmt} bukan format gambar yang didukung.")

        try:
            img = Image.open(io.BytesIO(image_bytes))
            # Handle EXIF orientation if present
            img = ImageOps.exif_transpose(img)
        except Exception as e:
            raise InvalidImageFormatError(f"File gambar rusak atau tidak dapat dibuka: {e}") from e

        w, h = img.size
        if w < MIN_IMAGE_DIMENSION or h < MIN_IMAGE_DIMENSION:
            raise ImageDimensionError(f"Dimensi gambar terlalu kecil ({w}x{h} piksel). Minimal {MIN_IMAGE_DIMENSION}x{MIN_IMAGE_DIMENSION}.")

        # Auto-downscale if exceeds MAX_IMAGE_DIMENSION to preserve memory and aspect ratio
        if w > MAX_IMAGE_DIMENSION or h > MAX_IMAGE_DIMENSION:
            scale = min(MAX_IMAGE_DIMENSION / w, MAX_IMAGE_DIMENSION / h)
            new_w, new_h = int(w * scale), int(h * scale)
            img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
            logger.info(f"Downscaled image from {w}x{h} to {new_w}x{new_h} for OCR processing.")

        if img.mode != "RGB":
            img = img.convert("RGB")

        return img

    def ocr_image_bytes(self, image_bytes: bytes, filename: str = "page.jpg") -> dict[str, Any]:
        """Runs OCR on single image bytes."""
        try:
            img = self.validate_and_load_image(image_bytes)
        except OCRError as e:
            return {
                "status": "FAILED",
                "text": "",
                "lines": [],
                "confidence": 0.0,
                "width": 0,
                "height": 0,
                "error": str(e),
            }

        w, h = img.size
        engine = self.get_engine()
        img_np = np.array(img)

        try:
            results, _elapse = engine(img_np)
        except Exception as e:
            logger.exception("Error during RapidOCR inference")
            return {
                "status": "FAILED",
                "text": "",
                "lines": [],
                "confidence": 0.0,
                "width": w,
                "height": h,
                "error": f"Kegagalan OCR: {e!s}",
            }

        if not results:
            return {
                "status": "EMPTY",
                "text": "",
                "lines": [],
                "confidence": 0.0,
                "width": w,
                "height": h,
                "error": "Tidak ada teks yang dapat dideteksi pada halaman ini. Pastikan foto jelas dan cukup cahaya.",
            }

        extracted_lines: list[dict[str, Any]] = []
        confidences: list[float] = []

        for item in results:
            # item structure: [box_points, text, confidence_str]
            if len(item) >= 2:
                line_text = str(item[1]).strip()
                score = float(item[2]) if len(item) >= 3 else 0.8
                if line_text:
                    extracted_lines.append({
                        "text": line_text,
                        "score": round(score, 3),
                        "box": item[0] if len(item) >= 1 else [],
                    })
                    confidences.append(score)

        if not extracted_lines:
            return {
                "status": "EMPTY",
                "text": "",
                "lines": [],
                "confidence": 0.0,
                "width": w,
                "height": h,
                "error": "Tidak ada teks terbaca pada halaman ini.",
            }

        full_text = "\n".join(line["text"] for line in extracted_lines)
        avg_conf = sum(confidences) / len(confidences) if confidences else 0.0

        return {
            "status": "SUCCESS",
            "text": full_text,
            "lines": extracted_lines,
            "confidence": round(avg_conf, 3),
            "width": w,
            "height": h,
            "error": None,
        }

    def process_pdf(self, pdf_bytes: bytes) -> list[dict[str, Any]]:
        """Processes PDF page-by-page. Uses text layer if present, otherwise rasterizes and runs OCR."""
        import pypdfium2 as pdfium
        from pypdf import PdfReader

        if not pdf_bytes or not pdf_bytes.startswith(PDF_MAGIC):
            raise InvalidImageFormatError("File bukan dokumen PDF yang valid.")

        try:
            reader = PdfReader(io.BytesIO(pdf_bytes))
            total_pages = len(reader.pages)
        except Exception as e:
            raise InvalidImageFormatError(f"Dokumen PDF rusak atau tidak dapat dibaca: {e}") from e

        if total_pages == 0:
            raise InvalidImageFormatError("Dokumen PDF tidak memuat halaman.")
        if total_pages > MAX_PAGES_ALLOWED:
            raise ImageDimensionError(f"Jumlah halaman PDF ({total_pages}) melebihi batas maksimum {MAX_PAGES_ALLOWED} halaman.")

        pdfium_doc = pdfium.PdfDocument(pdf_bytes)
        pages_result: list[dict[str, Any]] = []

        for i in range(total_pages):
            page_num = i + 1
            # 1. Check existing native text layer
            pypdf_page = reader.pages[i]
            native_text = (pypdf_page.extract_text() or "").strip()

            # Render image representation using pypdfium2 for preview and storage
            try:
                rendered_page = pdfium_doc.get_page(i)
                pil_image = rendered_page.render(scale=1.5).to_pil()
                img_buf = io.BytesIO()
                pil_image.save(img_buf, format="JPEG", quality=85)
                rendered_image_bytes = img_buf.getvalue()
                w, h = pil_image.size
            except Exception as e:
                logger.warning(f"Failed to render page {page_num} to image: {e}")
                rendered_image_bytes = b""
                w, h = 0, 0

            # If native text is significant (more than 25 chars or multiple words)
            if len(native_text) >= 20 and len(native_text.split()) >= 3:
                pages_result.append({
                    "pageNumber": page_num,
                    "source": "PDF_TEXT_PAGE",
                    "ocrStatus": "SUCCESS",
                    "extractedText": native_text,
                    "confirmedText": native_text,
                    "confidence": 1.0,
                    "imageBytes": rendered_image_bytes,
                    "width": w,
                    "height": h,
                    "error": None,
                })
            else:
                # Page has no sufficient text layer -> run OCR on rendered image
                if rendered_image_bytes:
                    ocr_res = self.ocr_image_bytes(rendered_image_bytes, f"pdf_page_{page_num}.jpg")
                    pages_result.append({
                        "pageNumber": page_num,
                        "source": "PDF_IMAGE_PAGE",
                        "ocrStatus": ocr_res["status"],
                        "extractedText": ocr_res["text"],
                        "confirmedText": ocr_res["text"],
                        "confidence": ocr_res["confidence"],
                        "imageBytes": rendered_image_bytes,
                        "width": ocr_res["width"],
                        "height": ocr_res["height"],
                        "error": ocr_res["error"],
                    })
                else:
                    pages_result.append({
                        "pageNumber": page_num,
                        "source": "PDF_IMAGE_PAGE",
                        "ocrStatus": "FAILED",
                        "extractedText": "",
                        "confirmedText": "",
                        "confidence": 0.0,
                        "imageBytes": b"",
                        "width": 0,
                        "height": 0,
                        "error": "Gagal merender halaman PDF untuk OCR.",
                    })

        return pages_result

    def assemble_pdf_from_images(self, images_bytes: list[bytes]) -> bytes:
        """Assembles a list of image bytes into a single combined PDF document."""
        if not images_bytes:
            raise ValueError("Daftar gambar kosong untuk pembuatan PDF.")

        pil_images = [self.validate_and_load_image(b) for b in images_bytes]
        first_img = pil_images[0]
        other_imgs = pil_images[1:] if len(pil_images) > 1 else []

        out_buf = io.BytesIO()
        first_img.save(out_buf, format="PDF", save_all=True, append_images=other_imgs)
        return out_buf.getvalue()


ocr_service = OCRService()
