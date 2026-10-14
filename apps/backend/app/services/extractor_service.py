import io
from typing import List, Dict, Any


def extract_text_from_pdf(content: bytes) -> str:
    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(content))
    pages_text: List[str] = []
    for i, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        if text.strip():
            pages_text.append(text.strip())
    return "\n\n".join(pages_text)


def extract_pages_from_pdf(content: bytes) -> List[Dict[str, Any]]:
    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(content))
    pages: List[Dict[str, Any]] = []
    for i, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        pages.append({
            "page": i + 1,
            "text": text.strip(),
        })
    return pages


def extract_text_from_docx(content: bytes) -> str:
    import docx

    doc = docx.Document(io.BytesIO(content))
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    # Also extract text from tables
    for table in doc.tables:
        for row in table.rows:
            row_texts = [cell.text.strip() for cell in row.cells if cell.text.strip()]
            if row_texts:
                paragraphs.append(" | ".join(row_texts))
    return "\n\n".join(paragraphs)


def extract_text_from_pptx(content: bytes) -> str:
    try:
        import pptx
        prs = pptx.Presentation(io.BytesIO(content))
        slides_text: List[str] = []
        for i, slide in enumerate(prs.slides):
            slide_texts = []
            for shape in slide.shapes:
                if shape.has_text_frame:
                    for paragraph in shape.text_frame.paragraphs:
                        if paragraph.text.strip():
                            slide_texts.append(paragraph.text.strip())
            if slide_texts:
                slides_text.append(f"[Slide {i + 1}]\n" + "\n".join(slide_texts))
        return "\n\n".join(slides_text)
    except Exception:
        return ""


def extract_text_from_buffer(content: bytes, file_type: str) -> str:
    kind = file_type.upper()
    if kind == "PDF":
        return extract_text_from_pdf(content)
    elif kind in ("DOCX", "DOC"):
        return extract_text_from_docx(content)
    elif kind in ("PPT", "PPTX"):
        return extract_text_from_pptx(content)
    elif kind == "TEXT" or kind == "TXT":
        return content.decode("utf-8", errors="replace")
    else:
        # Fallback decode
        try:
            return content.decode("utf-8")
        except UnicodeDecodeError:
            return extract_text_from_pdf(content)
