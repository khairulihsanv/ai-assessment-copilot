import hashlib
import re
from typing import Any


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def chunk_text(
    text: str,
    max_chunk_chars: int = 1500,
    overlap_chars: int = 200,
    locator_type: str = "section",
) -> list[dict[str, Any]]:
    """
    Split text into chunks with metadata and character/token estimate.
    """
    clean_text = text.strip()
    if not clean_text:
        return []

    # Split by double newlines or paragraphs first
    paragraphs = re.split(r"\n\s*\n", clean_text)
    chunks: list[dict[str, Any]] = []

    current_chunk = ""
    chunk_index = 0

    for p in paragraphs:
        p_clean = p.strip()
        if not p_clean:
            continue

        if len(current_chunk) + len(p_clean) + 2 <= max_chunk_chars:
            if current_chunk:
                current_chunk += "\n\n" + p_clean
            else:
                current_chunk = p_clean
        else:
            if current_chunk:
                chunks.append({
                    "chunkIndex": chunk_index,
                    "tokenEstimate": len(current_chunk) // 4,
                    "rawText": current_chunk,
                    "normalizedText": current_chunk.lower(),
                    "locator": {"type": locator_type, "index": chunk_index},
                    "checksum": sha256_text(current_chunk),
                })
                chunk_index += 1

            # Handle paragraph itself if it's longer than max_chunk_chars
            if len(p_clean) > max_chunk_chars:
                start = 0
                while start < len(p_clean):
                    sub = p_clean[start : start + max_chunk_chars]
                    chunks.append({
                        "chunkIndex": chunk_index,
                        "tokenEstimate": len(sub) // 4,
                        "rawText": sub,
                        "normalizedText": sub.lower(),
                        "locator": {"type": locator_type, "index": chunk_index},
                        "checksum": sha256_text(sub),
                    })
                    chunk_index += 1
                    start += max_chunk_chars - overlap_chars
                current_chunk = ""
            else:
                current_chunk = p_clean

    if current_chunk:
        chunks.append({
            "chunkIndex": chunk_index,
            "tokenEstimate": len(current_chunk) // 4,
            "rawText": current_chunk,
            "normalizedText": current_chunk.lower(),
            "locator": {"type": locator_type, "index": chunk_index},
            "checksum": sha256_text(current_chunk),
        })

    return chunks
