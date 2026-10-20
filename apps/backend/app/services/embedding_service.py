import math
import re
from typing import Any

import httpx

from app.config import settings


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
    def __init__(self, vector: list[float], model: str, dimension: int = 768, is_mock: bool = False):
        self.vector = vector
        self.model = model
        self.dimension = dimension
        self.is_mock = is_mock


async def generate_embedding_result(text: str, allow_mock: bool | None = None) -> EmbeddingResult:
    """
    Generate embedding vector for text using configured Ollama nomic-embed-text API.
    Does NOT silently disguise hash projections as nomic-embed-text.
    In testing/mock environments, explicitly marks the model as 'test-deterministic-mock-v1'.
    """
    import os
    is_test_env = (
        allow_mock is True
        or settings.ENVIRONMENT == "test"
        or os.environ.get("TEST_MOCK_EMBEDDING") == "true"
        or getattr(settings, "ALLOW_STUB_PROVIDERS", False)
        or os.environ.get("ALLOW_STUB_PROVIDERS") == "true"
    )

    if not text.strip():
        model_name = "test-deterministic-mock-v1" if is_test_env else "nomic-embed-text"
        return EmbeddingResult(vector=[0.0] * 768, model=model_name, dimension=768, is_mock=is_test_env)

    # 1. In explicit mock/test mode, generate a deterministic projection clearly labeled as mock
    if is_test_env and (allow_mock is True or os.environ.get("TEST_MOCK_EMBEDDING") == "true"):
        dim = 768
        vec = [0.0] * dim
        words = re.findall(r"\w+", text.lower())
        for w in words:
            idx = hash(w) % dim
            vec[idx] += 1.0

        norm = math.sqrt(sum(x * x for x in vec))
        if norm > 0:
            vec = [x / norm for x in vec]
        return EmbeddingResult(vector=vec, model="test-deterministic-mock-v1", dimension=768, is_mock=True)

    # 2. Try Ollama embeddings
    ollama_error = None
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.post(
                f"{settings.OLLAMA_BASE_URL}/api/embeddings",
                json={"model": "nomic-embed-text", "prompt": text[:4000]},
            )
            if resp.status_code == 200:
                data = resp.json()
                if "embedding" in data and isinstance(data["embedding"], list):
                    vec = data["embedding"]
                    if len(vec) != 768:
                        raise EmbeddingDimensionMismatchError(
                            f"Dimensi vektor dari nomic-embed-text ({len(vec)}) tidak sesuai dengan pgvector (768)."
                        )
                    return EmbeddingResult(vector=vec, model="nomic-embed-text", dimension=768, is_mock=False)
                else:
                    ollama_error = f"Respons Ollama tidak memuat list embedding: {data}"
            else:
                ollama_error = f"Ollama HTTP {resp.status_code}: {resp.text}"
    except EmbeddingDimensionMismatchError:
        raise
    except Exception as e:
        ollama_error = str(e)

    # 3. If mock is allowed in test environments when Ollama is offline, return explicit test mock
    if is_test_env:
        dim = 768
        vec = [0.0] * dim
        words = re.findall(r"\w+", text.lower())
        for w in words:
            idx = hash(w) % dim
            vec[idx] += 1.0

        norm = math.sqrt(sum(x * x for x in vec))
        if norm > 0:
            vec = [x / norm for x in vec]
        return EmbeddingResult(vector=vec, model="test-deterministic-mock-v1", dimension=768, is_mock=True)

    # 4. In real production / non-mock mode, DO NOT disguise fallback as nomic-embed-text!
    raise EmbeddingProviderUnavailableError(
        f"Layanan embedding Ollama ({settings.OLLAMA_BASE_URL}) tidak tersedia: {ollama_error}. "
        "Vektor semantik nyata tidak dapat dibuat."
    )


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
    """
    ak_sim = 0.0
    mat_sim = 0.0

    # 1. Answer Key similarity
    if answer_key and answer_key.strip():
        if student_embedding and answer_key_embedding:
            ak_sim = cosine_similarity(student_embedding, answer_key_embedding)
        else:
            ak_sim = text_overlap_similarity(student_answer, answer_key)

    # 2. Material similarity
    if material and material.strip():
        if student_embedding and material_embedding:
            mat_sim = cosine_similarity(student_embedding, material_embedding)
        else:
            mat_sim = text_overlap_similarity(student_answer, material)

    # 3. Combined weighted score
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
