"""Retrieval over the *student's own answer*.

The answer is split into short passages with exact character offsets so that
any quote the model returns can be highlighted in the original text. For each
rubric criterion we rank passages with a hybrid score:

    0.7 × cosine(embedding) + 0.3 × normalised BM25

If the embedding provider is unavailable the ranking falls back to BM25 only
(``mode == "lexical"``). Retrieval never produces a grade; it only tells the
model (and the lecturer) where to look.
"""

from __future__ import annotations

import logging
import math
import re
from collections import Counter
from dataclasses import asdict, dataclass
from typing import Any

from app.config import settings
from app.services.embedding_service import cosine_similarity, generate_embeddings_batch

logger = logging.getLogger(__name__)

PASSAGE_TARGET_CHARS = 420
PASSAGE_MAX_CHARS = 700
_MIN_MERGE_CHARS = 120

STOPWORDS = frozenset(
    """
    yang dan di ke dari untuk pada dengan adalah ini itu atau dalam tidak akan juga karena sebagai oleh
    dapat bisa ada lebih sudah telah agar supaya maka jika kalau bahwa secara saat serta tersebut setiap
    para kami kita saya anda mereka ia dia nya pun lah kah hal cara seperti antara hingga sampai bagi
    sehingga namun tetapi tapi masih harus perlu sangat banyak beberapa semua suatu sebuah satu
    the a an and or of to in on for with is are was were be been being this that these those it its as by
    at from into than then there their they them we you your our not no but if so do does did can could
    should would will may might must have has had which what who whom whose how why when where
    jelaskan sebutkan uraikan berikan mahasiswa jawaban
    """.split()  # noqa: SIM905 - readable word list
)


@dataclass
class Passage:
    id: str
    start: int
    end: int
    text: str


def _sentence_spans(text: str, start: int, end: int) -> list[tuple[int, int]]:
    """Split text[start:end] into trimmed sentence spans (absolute offsets)."""
    spans: list[tuple[int, int]] = []
    seg_start = start
    i = start
    while i < end:
        ch = text[i]
        cut_at: int | None = None
        if ch == "\n":
            cut_at = i
        elif ch in ".!?":
            j = i
            while j + 1 < end and text[j + 1] in ".!?\"')]":
                j += 1
            if j + 1 >= end or text[j + 1].isspace():
                cut_at = j + 1
                i = j
        if cut_at is not None:
            spans.append((seg_start, cut_at))
            seg_start = cut_at
        i += 1
    if seg_start < end:
        spans.append((seg_start, end))

    trimmed: list[tuple[int, int]] = []
    for s, e in spans:
        while s < e and text[s].isspace():
            s += 1
        while e > s and text[e - 1].isspace():
            e -= 1
        if e > s:
            trimmed.append((s, e))
    return trimmed


def _hard_split(text: str, start: int, end: int) -> list[tuple[int, int]]:
    """Split an overly long sentence near whitespace so no piece exceeds PASSAGE_MAX_CHARS."""
    pieces: list[tuple[int, int]] = []
    s = start
    while end - s > PASSAGE_MAX_CHARS:
        cut = text.rfind(" ", s + PASSAGE_TARGET_CHARS // 2, s + PASSAGE_MAX_CHARS)
        if cut <= s:
            cut = s + PASSAGE_MAX_CHARS
        e = cut
        while e > s and text[e - 1].isspace():
            e -= 1
        pieces.append((s, e))
        s = cut
        while s < end and text[s].isspace():
            s += 1
    if s < end:
        pieces.append((s, end))
    return pieces


def split_passages(text: str) -> list[Passage]:
    """Group sentences into ~420-char passages (max 700) without crossing blank-line paragraphs.

    Invariant: ``text[p.start:p.end] == p.text`` for every passage.
    """
    if not text or not text.strip():
        return []

    paragraphs: list[tuple[int, int]] = []
    pos = 0
    for m in re.finditer(r"\n[ \t\r\f\v]*\n\s*", text):
        paragraphs.append((pos, m.start()))
        pos = m.end()
    paragraphs.append((pos, len(text)))

    spans: list[tuple[int, int]] = []
    for p_start, p_end in paragraphs:
        sentences: list[tuple[int, int]] = []
        for s, e in _sentence_spans(text, p_start, p_end):
            sentences.extend(_hard_split(text, s, e) if e - s > PASSAGE_MAX_CHARS else [(s, e)])

        current: tuple[int, int] | None = None
        for s, e in sentences:
            if current is None:
                current = (s, e)
                continue
            merged_len = e - current[0]
            cur_len = current[1] - current[0]
            if merged_len <= PASSAGE_TARGET_CHARS or (cur_len < _MIN_MERGE_CHARS and merged_len <= PASSAGE_MAX_CHARS):
                current = (current[0], e)
            else:
                spans.append(current)
                current = (s, e)
        if current is not None:
            spans.append(current)

    return [Passage(id=f"P{i + 1}", start=s, end=e, text=text[s:e]) for i, (s, e) in enumerate(spans)]


def tokenize(text: str) -> list[str]:
    return [t for t in re.findall(r"[a-z0-9]+", (text or "").lower()) if len(t) > 1 and t not in STOPWORDS]


def bm25_scores(query_tokens: list[str], docs_tokens: list[list[str]], k1: float = 1.5, b: float = 0.75) -> list[float]:
    n = len(docs_tokens)
    if n == 0 or not query_tokens:
        return [0.0] * n
    avgdl = sum(len(d) for d in docs_tokens) / n or 1.0
    df: Counter[str] = Counter()
    for d in docs_tokens:
        df.update(set(d))
    scores = []
    q_terms = set(query_tokens)
    for d in docs_tokens:
        tf = Counter(d)
        dl = len(d) or 1
        score = 0.0
        for term in q_terms:
            if term not in tf:
                continue
            idf = math.log(1 + (n - df[term] + 0.5) / (df[term] + 0.5))
            freq = tf[term]
            score += idf * (freq * (k1 + 1)) / (freq + k1 * (1 - b + b * dl / avgdl))
        scores.append(score)
    return scores


def criterion_query(criterion: dict[str, Any]) -> str:
    parts = [
        criterion.get("label") or "",
        criterion.get("description") or "",
        criterion.get("expectedAnswer") or criterion.get("answerKey") or "",
    ]
    return " ".join(p for p in parts if p).strip()


async def retrieve_evidence(text: str, criteria: list[dict[str, Any]], top_k: int | None = None) -> dict[str, Any]:
    """Rank answer passages for every criterion.

    Returns ``{"passages", "byCriterion", "mode", "embedModel"}``. ``byCriterion`` maps a
    criterion id to its top-k ``{"passageId", "score", "cosine", "bm25"}`` entries.
    """
    k = top_k if top_k is not None else settings.EVIDENCE_TOP_K
    passages = split_passages(text)
    result: dict[str, Any] = {
        "passages": [asdict(p) for p in passages],
        "byCriterion": {},
        "mode": "lexical",
        "embedModel": None,
    }
    if not passages or not criteria:
        return result

    queries = [criterion_query(c) for c in criteria]
    passage_tokens = [tokenize(p.text) for p in passages]

    passage_vecs: list[list[float]] | None = None
    query_vecs: list[list[float]] | None = None
    try:
        embedded = await generate_embeddings_batch([p.text for p in passages] + queries)
        passage_vecs = [e.vector for e in embedded[: len(passages)]]
        query_vecs = [e.vector for e in embedded[len(passages) :]]
        result["mode"] = "hybrid"
        result["embedModel"] = embedded[0].model if embedded else None
    except Exception as exc:  # provider offline, model missing, dimension mismatch…
        logger.warning("Embedding unavailable, falling back to lexical retrieval: %s", exc)

    for c_idx, criterion in enumerate(criteria):
        raw_bm25 = bm25_scores(tokenize(queries[c_idx]), passage_tokens)
        max_bm25 = max(raw_bm25) if raw_bm25 else 0.0
        norm_bm25 = [s / max_bm25 if max_bm25 > 0 else 0.0 for s in raw_bm25]

        ranked: list[dict[str, Any]] = []
        for p_idx, passage in enumerate(passages):
            cos = 0.0
            if passage_vecs is not None and query_vecs is not None:
                cos = cosine_similarity(passage_vecs[p_idx], query_vecs[c_idx])
                score = 0.7 * cos + 0.3 * norm_bm25[p_idx]
            else:
                score = norm_bm25[p_idx]
            ranked.append({
                "passageId": passage.id,
                "score": round(score, 4),
                "cosine": round(cos, 4),
                "bm25": round(norm_bm25[p_idx], 4),
            })
        ranked.sort(key=lambda r: (-float(r["score"]), int(str(r["passageId"])[1:])))
        result["byCriterion"][criterion["id"]] = ranked[: max(1, k)]

    return result
