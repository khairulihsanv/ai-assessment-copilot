"""Mask student-identifying data before it is sent to a language model (NFR-01).

The model only ever sees the masked text. Quotes it returns may therefore contain
tokens like ``[MAHASISWA]``; ``masked_quote_to_regex`` turns such a quote back into
a pattern that can be located in the original, unmasked answer.
"""

from __future__ import annotations

import re
from collections.abc import Iterable

TOKEN_NAME = "[MAHASISWA]"
TOKEN_EMAIL = "[EMAIL]"
TOKEN_NIM = "[NIM]"
TOKEN_PHONE = "[TELEPON]"
TOKENS = (TOKEN_NAME, TOKEN_EMAIL, TOKEN_NIM, TOKEN_PHONE)

_EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
# "NIM: K3519001", "NIP 1987...", "No. Induk: ..." — the label is kept, the value masked.
_LABELED_ID_RE = re.compile(
    r"(?i)\b(NIM|NIP|NPM|NRP|No\.?\s*Induk)(\s*[:.=\-]?\s*)([A-Za-z0-9./-]{4,25})"
)
# Indonesian mobile numbers: +62 / 62 / 0 followed by 8xx, optional separators.
_PHONE_RE = re.compile(r"(?<![\w+])(?:\+62|62|0)\s?8\d{1,2}(?:[\s.-]?\d{2,4}){2,3}(?!\w)")
# Letter-prefixed ids (K3519001, M0521045) are masked anywhere, except currency ("Rp15000000").
_PREFIXED_ID_RE = re.compile(r"(?<![A-Za-z0-9])(?![Rr][Pp]\d)[A-Za-z]{1,2}\d{7,18}(?![A-Za-z0-9])")
# A bare digit run is only treated as a NIM in the identity header at the top of an answer.
# In the body it is content (amounts, row counts, results) and the model must see it.
_BARE_NUMBER_RE = re.compile(r"(?<![A-Za-z0-9])\d{7,18}(?![A-Za-z0-9])")
HEADER_CHARS = 400
_TOKEN_SPLIT_RE = re.compile(r"\[(?:MAHASISWA|EMAIL|NIM|TELEPON)\]")
_NEVER_MATCH = re.compile(r"(?!x)x")


def _name_variants(names: Iterable[str | None]) -> list[str]:
    variants: set[str] = set()
    for name in names:
        if not name:
            continue
        cleaned = " ".join(name.split())
        if len(cleaned) >= 3:
            variants.add(cleaned)
        for part in re.split(r"[\s,.'-]+", cleaned):
            if len(part) >= 3 and part.isalpha():
                variants.add(part)
    # Longest first so the full name is replaced before its parts.
    return sorted(variants, key=len, reverse=True)


def anonymize_text(text: str, student_names: Iterable[str | None] = (), offset: int = 0) -> str:
    """Replace names, emails, NIM/NIP and phone numbers with neutral tokens.

    ``offset`` is where ``text`` starts in the full answer: a passage from the middle of an
    answer keeps its numbers, while the identity header at the top is masked.
    """
    if not text:
        return text

    masked = _EMAIL_RE.sub(TOKEN_EMAIL, text)
    masked = _LABELED_ID_RE.sub(lambda m: f"{m.group(1)}{m.group(2)}{TOKEN_NIM}", masked)
    masked = _PHONE_RE.sub(TOKEN_PHONE, masked)
    masked = _PREFIXED_ID_RE.sub(TOKEN_NIM, masked)
    # Earlier substitutions shift offsets a little; that is fine for a 400-character window.
    masked = _BARE_NUMBER_RE.sub(
        lambda m: TOKEN_NIM if offset + m.start() < HEADER_CHARS else m.group(0), masked
    )

    for variant in _name_variants(student_names):
        pattern = re.compile(rf"(?<![\w\[]){re.escape(variant)}(?![\w\]])", re.IGNORECASE)
        masked = pattern.sub(TOKEN_NAME, masked)
    return masked


def contains_token(text: str) -> bool:
    return bool(_TOKEN_SPLIT_RE.search(text or ""))


def masked_quote_to_regex(quote: str) -> re.Pattern[str]:
    """Build a regex that finds a (possibly token-masked) model quote in the original text.

    - Tokens at the very start/end of the quote are dropped (they add nothing to locate it).
    - A token in the middle matches 1–4 non-space words (``\\S+(?:\\s+\\S+){0,3}?``).
    - Whitespace is flexible and matching is case-insensitive.
    - An empty quote yields a pattern that never matches.
    """
    if not quote or not quote.strip():
        return _NEVER_MATCH

    pieces = _TOKEN_SPLIT_RE.split(quote)
    literals = [p.strip() for p in pieces]
    # Drop empty literal segments at the edges (i.e. leading/trailing tokens).
    while literals and not literals[0]:
        literals.pop(0)
    while literals and not literals[-1]:
        literals.pop()
    if not literals:
        return _NEVER_MATCH

    token_gap = r"\s*\S+(?:\s+\S+){0,3}?\s*"
    parts: list[str] = []
    for i, literal in enumerate(literals):
        if i > 0:
            parts.append(token_gap)
        if literal:
            parts.append(r"\s+".join(re.escape(w) for w in literal.split()))
    return re.compile("".join(parts), re.IGNORECASE)
