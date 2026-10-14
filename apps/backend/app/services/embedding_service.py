import math
import re
from typing import List, Optional, Dict, Any
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


def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    """Calculate cosine similarity between two float vectors."""
    if not vec_a or not vec_b or len(vec_a) != len(vec_b):
        return 0.0

    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))

    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0

    return max(0.0, min(1.0, dot / (norm_a * norm_b)))


async def generate_embedding(text: str) -> List[float]:
    """
    Generate embedding vector for text using configured embedding API or Ollama.
    Falls back to deterministic hash projection if external API unavailable.
    """
    if not text.strip():
        return [0.0] * 768

    # Try Ollama embeddings if available
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(
                f"{settings.OLLAMA_BASE_URL}/api/embeddings",
                json={"model": "nomic-embed-text", "prompt": text[:4000]},
            )
            if resp.status_code == 200:
                data = resp.json()
                if "embedding" in data and isinstance(data["embedding"], list):
                    return data["embedding"][:768]
    except Exception:
        pass

    # Deterministic pseudo-embedding from character/token distribution as stable fallback
    dim = 768
    vec = [0.0] * dim
    words = re.findall(r"\w+", text.lower())
    for w in words:
        idx = hash(w) % dim
        vec[idx] += 1.0

    norm = math.sqrt(sum(x * x for x in vec))
    if norm > 0:
        vec = [x / norm for x in vec]
    return vec


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
    answer_key: Optional[str] = None,
    material: Optional[str] = None,
    student_embedding: Optional[List[float]] = None,
    answer_key_embedding: Optional[List[float]] = None,
    material_embedding: Optional[List[float]] = None,
) -> Dict[str, Any]:
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
