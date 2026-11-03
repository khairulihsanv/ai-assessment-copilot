import hashlib
import math
import os
import re
from typing import Any

import httpx

from app.config import settings

EMBEDDING_DIMENSION = 768
MOCK_MODEL = "test-deterministic-mock-v1"
EMBED_TIMEOUT_SECONDS = 60.0
MAX_EMBED_CHARS = 4000


def text_overlap_similarity(text_a: str, text_b: str) -> float:
    """Fallback lexical word overlap similarity (Jaccard similarity on tokens)."""
    if not text_a or not text_b:
        return 0.0

    def tokenize(t: str):
        return set(re.findall(r"\w+", t.lower()))

    tokens_a = tokenize(text_a)
    tokens_b = tokenize(text_b)

    if not tokens_a or not tokens_b:
        return 0.0

    intersection = len(tokens_a & tokens_b)
    union = len(tokens_a | tokens_b)
    return intersection / union if union > 0 else 0.0


def cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    """Calculate cosine similarity between two float vectors."""
    if not vec_a or not vec_b or len(vec_a) != len(vec_b):
        return 0.0

    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))

    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0

    return max(0.0, min(1.0, dot / (norm_a * norm_b)))


class EmbeddingError(Exception):
    """Base error for embedding operations."""


class EmbeddingProviderUnavailableError(EmbeddingError):
    """Raised when the embedding provider (e.g. Ollama) is offline, unreachable, or returns an error."""


class EmbeddingDimensionMismatchError(EmbeddingError):
    """Raised when the vector dimension does not match expected 768 dimensions."""


class EmbeddingResult:
    def __init__(self, vector: list[float], model: str, dimension: int = EMBEDDING_DIMENSION, is_mock: bool = False):
        self.vector = vector
        self.model = model
        self.dimension = dimension
        self.is_mock = is_mock


def _is_test_env(allow_mock: bool | None) -> bool:
    return (
        allow_mock is True
        or settings.ENVIRONMENT == "test"
        or os.environ.get("TEST_MOCK_EMBEDDING") == "true"
        or bool(getattr(settings, "ALLOW_STUB_PROVIDERS", False))
        or os.environ.get("ALLOW_STUB_PROVIDERS") == "true"
    )


def _force_mock(allow_mock: bool | None) -> bool:
    return allow_mock is True or os.environ.get("TEST_MOCK_EMBEDDING") == "true"


def _mock_vector(text: str) -> list[float]:
    """Deterministic bag-of-words projection.

    Uses md5 (not Python's salted ``hash()``) so vectors are identical across processes.
    """
    vec = [0.0] * EMBEDDING_DIMENSION
    for word in re.findall(r"\w+", text.lower()):
        idx = int(hashlib.md5(word.encode("utf-8")).hexdigest(), 16) % EMBEDDING_DIMENSION
        vec[idx] += 1.0
    norm = math.sqrt(sum(x * x for x in vec))
    if norm > 0:
        vec = [x / norm for x in vec]
    return vec


def _validate_dimension(vec: list[Any], model: str) -> list[float]:
    if len(vec) != EMBEDDING_DIMENSION:
        raise EmbeddingDimensionMismatchError(
            f"Dimensi vektor dari {model} ({len(vec)}) tidak sesuai dengan pgvector ({EMBEDDING_DIMENSION})."
        )
    return [float(x) for x in vec]


def _extract_vectors(data: Any) -> list[list[Any]] | None:
    if not isinstance(data, dict):
        return None
    if isinstance(data.get("embeddings"), list) and data["embeddings"]:
        return data["embeddings"]
    if isinstance(data.get("embedding"), list):
        return [data["embedding"]]
    return None


async def _ollama_embed_batch(texts: list[str]) -> list[list[float]]:
    """Call Ollama's batch /api/embed, falling back to legacy /api/embeddings on 404."""
    model = settings.OLLAMA_EMBED_MODEL
    base = settings.OLLAMA_BASE_URL.rstrip("/")
    inputs = [t[:MAX_EMBED_CHARS] for t in texts]

    async with httpx.AsyncClient(timeout=EMBED_TIMEOUT_SECONDS) as client:
        resp = await client.post(f"{base}/api/embed", json={"model": model, "input": inputs})
        if resp.status_code == 200:
            vectors = _extract_vectors(resp.json())
            if vectors is None:
                raise EmbeddingProviderUnavailableError(f"Respons Ollama tidak memuat list embedding: {resp.text[:200]}")
            if len(vectors) != len(inputs):
                raise EmbeddingProviderUnavailableError(
                    f"Ollama mengembalikan {len(vectors)} vektor untuk {len(inputs)} teks."
                )
            return [_validate_dimension(v, model) for v in vectors]

        if resp.status_code != 404 or "model" in (resp.text or "").lower():
            if resp.status_code == 404:
                raise EmbeddingProviderUnavailableError(
                    f"Model embedding '{model}' belum tersedia. Jalankan: ollama pull {model}"
                )
            raise EmbeddingProviderUnavailableError(f"Ollama HTTP {resp.status_code}: {resp.text[:200]}")

        # Older Ollama: one request per text on /api/embeddings.
        results: list[list[float]] = []
        for text in inputs:
            legacy = await client.post(f"{base}/api/embeddings", json={"model": model, "prompt": text})
            if legacy.status_code != 200:
                raise EmbeddingProviderUnavailableError(f"Ollama HTTP {legacy.status_code}: {legacy.text[:200]}")
            vectors = _extract_vectors(legacy.json())
            if not vectors:
                raise EmbeddingProviderUnavailableError("Respons Ollama tidak memuat list embedding.")
            results.append(_validate_dimension(vectors[0], model))
        return results


async def generate_embeddings_batch(texts: list[str], allow_mock: bool | None = None) -> list[EmbeddingResult]:
    """Embed several texts in one call. Empty texts map to zero vectors."""
    is_test_env = _is_test_env(allow_mock)
    model_label = MOCK_MODEL if is_test_env else settings.OLLAMA_EMBED_MODEL

    results: list[EmbeddingResult | None] = [None] * len(texts)
    pending_idx: list[int] = []
    for i, t in enumerate(texts):
        if not t or not t.strip():
            results[i] = EmbeddingResult([0.0] * EMBEDDING_DIMENSION, model_label, EMBEDDING_DIMENSION, is_test_env)
        else:
            pending_idx.append(i)

    if pending_idx:
        if is_test_env and _force_mock(allow_mock):
            for i in pending_idx:
                results[i] = EmbeddingResult(_mock_vector(texts[i]), MOCK_MODEL, EMBEDDING_DIMENSION, True)
        else:
            error: str | None = None
            try:
                vectors = await _ollama_embed_batch([texts[i] for i in pending_idx])
                for i, vec in zip(pending_idx, vectors):
                    results[i] = EmbeddingResult(vec, settings.OLLAMA_EMBED_MODEL, EMBEDDING_DIMENSION, False)
            except EmbeddingDimensionMismatchError:
                raise
            except Exception as exc:  # network errors, provider errors
                error = str(exc)

            if error is not None:
                if is_test_env:
                    for i in pending_idx:
                        results[i] = EmbeddingResult(_mock_vector(texts[i]), MOCK_MODEL, EMBEDDING_DIMENSION, True)
                else:
                    # Never disguise a fallback as a real semantic embedding.
                    raise EmbeddingProviderUnavailableError(
                        f"Layanan embedding Ollama ({settings.OLLAMA_BASE_URL}) tidak tersedia: {error}. "
                        "Vektor semantik nyata tidak dapat dibuat."
                    )

    return [r for r in results if r is not None]


async def generate_embedding_result(text: str, allow_mock: bool | None = None) -> EmbeddingResult:
    """Embed a single text with the configured Ollama embedding model (768 dims)."""
    return (await generate_embeddings_batch([text], allow_mock=allow_mock))[0]


async def generate_embedding(text: str, allow_mock: bool | None = None) -> list[float]:
    """Helper that returns raw vector for backward compatibility."""
    result = await generate_embedding_result(text, allow_mock=allow_mock)
    return result.vector


def classify_score(score: float) -> str:
    """Classify 0-100 similarity score according to rubric guidelines."""
    if score >= 80:
        return "SANGAT BAIK"
    elif score >= 65:
        return "BAIK"
    elif score >= 50:
        return "CUKUP"
    elif score >= 30:
        return "KURANG"
    else:
        return "TIDAK SESUAI"


def compute_similarity(
    student_answer: str,
    answer_key: str | None = None,
    material: str | None = None,
    student_embedding: list[float] | None = None,
    answer_key_embedding: list[float] | None = None,
    material_embedding: list[float] | None = None,
) -> dict[str, Any]:
    """
    Compute combined similarity between student answer and reference materials/key.
    Uses vector cosine similarity if embeddings are present, otherwise falls back to text overlap.
    Informational only — never used as a grade (NFR-04).
    """
    ak_sim = 0.0
    mat_sim = 0.0

    if answer_key and answer_key.strip():
        if student_embedding and answer_key_embedding:
            ak_sim = cosine_similarity(student_embedding, answer_key_embedding)
        else:
            ak_sim = text_overlap_similarity(student_answer, answer_key)

    if material and material.strip():
        if student_embedding and material_embedding:
            mat_sim = cosine_similarity(student_embedding, material_embedding)
        else:
            mat_sim = text_overlap_similarity(student_answer, material)

    if answer_key and material:
        combined = ak_sim * 0.7 + mat_sim * 0.3
    elif answer_key:
        combined = ak_sim
    elif material:
        combined = mat_sim
    else:
        combined = 0.0

    combined_score = round(combined * 100, 1)

    return {
        "answerKeySimilarity": round(ak_sim, 3),
        "materialSimilarity": round(mat_sim, 3),
        "combinedScore": combined_score,
        "classification": classify_score(combined_score),
    }
