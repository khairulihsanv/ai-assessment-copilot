"""Find the parts of a long report that carry no rubric evidence.

Lab reports, final projects and theses arrive with a cover page, approval sheet,
preface, table of contents and bibliography. None of it answers a rubric criterion,
but all of it costs tokens and pushes real content out of the model's budget.

Nothing is deleted from the answer. ``find_boilerplate`` returns character spans, so
passage offsets stay valid and every quote the model returns can still be located
and highlighted in the original text. Passages that fall inside a span are simply not
ranked or sent to the model. Short essays are left untouched.
"""

from __future__ import annotations

import re
from collections import Counter
from dataclasses import dataclass

# Below this length an answer is an essay, not a report: nothing is skipped.
MIN_REPORT_CHARS = 4000
# Never skip more than this share of an answer; past it the heuristics are probably wrong.
MAX_SKIPPED_SHARE = 0.6
# A front-matter section (preface, approval sheet) longer than this is not front matter.
MAX_FRONT_MATTER_CHARS = 8000
MAX_COVER_CHARS = 2500

_FRONT_MATTER = (
    r"kata\s+pengantar|prakata|ucapan\s+terima\s+kasih|lembar\s+pengesahan|halaman\s+pengesahan"
    r"|lembar\s+persetujuan|halaman\s+persetujuan|pernyataan\s+keaslian|surat\s+pernyataan|halaman\s+judul"
    r"|motto|persembahan|preface|acknowledg(?:e)?ments?"
)
_CONTENTS = r"daftar\s+isi|daftar\s+gambar|daftar\s+tabel|daftar\s+lampiran|daftar\s+singkatan|table\s+of\s+contents|contents"
_BIBLIOGRAPHY = r"daftar\s+pustaka|daftar\s+referensi|daftar\s+rujukan|referensi|references|bibliography|bibliografi|pustaka"
# Headings that start real content: front matter ends where one of these begins.
_CONTENT_START = (
    r"abstra[kc]t?|intisari|ringkasan|bab\s+[ivx\d]+\b.*|pendahuluan|latar\s+belakang|introduction"
    r"|tujuan(?:\s+praktikum)?|dasar\s+teori|landasan\s+teori|tinjauan\s+pustaka|i\.\s+\S.*|1\.?\s+pendahuluan"
)

_HEADING_PREFIX = r"^[ \t]*(?:(?:bab\s+[ivx\d]+|[ivx]+\.|\d+(?:\.\d+)*\.?)[ \t]*[:.\-–]?[ \t]*)?"
_FRONT_RE = re.compile(_HEADING_PREFIX + rf"(?:{_FRONT_MATTER})[ \t]*:?[ \t]*$", re.I | re.M)
_CONTENTS_RE = re.compile(_HEADING_PREFIX + rf"(?:{_CONTENTS})[ \t]*:?[ \t]*$", re.I | re.M)
_BIB_RE = re.compile(_HEADING_PREFIX + rf"(?:{_BIBLIOGRAPHY})[ \t]*:?[ \t]*$", re.I | re.M)
_CONTENT_START_RE = re.compile(rf"^[ \t]*(?:{_CONTENT_START})[ \t]*:?[ \t]*$", re.I | re.M)
_APPENDIX_RE = re.compile(_HEADING_PREFIX + r"(?:lampiran|appendix|appendices)\b[^\n]{0,60}$", re.I | re.M)
# "2.1 Dasar Teori ........ 5", "BAB I PENDAHULUAN 1", "Gambar 3.2 Rangkaian … iv"
_TOC_ENTRY_RE = re.compile(r"(?:\.{3,}|…{1,}|\s{2,})\s*(?:\d{1,3}|[ivxlc]{1,6})\s*$|\s(?:\d{1,3}|[ivxlc]{1,6})\s*$", re.I)
_COVER_HINT_RE = re.compile(
    r"\b(?:disusun\s+oleh|diajukan\s+(?:oleh|untuk)|nim\b|npm\b|program\s+studi|fakultas|universitas|institut|politeknik"
    r"|sekolah\s+tinggi|laporan\s+(?:praktikum|akhir|tugas)|tugas\s+besar|dosen\s+pengampu|asisten)",
    re.I,
)
_PAGE_NUMBER_RE = re.compile(r"^[ \t]*(?:-\s*)?(?:hal(?:aman)?\.?\s*)?(?:\d{1,3}|[ivxlc]{1,6})(?:\s*-)?(?:\s*(?:dari|/|of)\s*\d{1,3})?[ \t]*$", re.I)


@dataclass(frozen=True)
class Span:
    start: int
    end: int
    label: str

    @property
    def length(self) -> int:
        return self.end - self.start


def _lines(text: str) -> list[tuple[int, int, str]]:
    out: list[tuple[int, int, str]] = []
    pos = 0
    for line in text.split("\n"):
        out.append((pos, pos + len(line), line))
        pos += len(line) + 1
    return out


def _next_heading_after(text: str, pos: int, *patterns: re.Pattern[str]) -> int | None:
    found = [m.start() for p in patterns if (m := p.search(text, pos))]
    return min(found) if found else None


def _toc_span(text: str, heading: re.Match[str]) -> int:
    """End of a table of contents: the first two consecutive lines that are not TOC entries."""
    end = heading.end()
    misses = 0
    for start, stop, line in _lines(text[heading.end():]):
        stripped = line.strip()
        if not stripped:
            continue
        if _TOC_ENTRY_RE.search(stripped) or _CONTENTS_RE.fullmatch(stripped) or len(stripped) <= 3:
            end = heading.end() + stop
            misses = 0
            continue
        misses += 1
        if misses >= 2:
            break
    return end


def find_boilerplate(text: str) -> list[Span]:
    """Spans of front matter, tables of contents, bibliography and the cover page."""
    if not text or len(text) < MIN_REPORT_CHARS:
        return []
    spans: list[Span] = []

    # Cover page: identity block before the first real heading near the top.
    first_heading = _next_heading_after(text, 0, _FRONT_RE, _CONTENTS_RE, _CONTENT_START_RE)
    if first_heading and 0 < first_heading <= MAX_COVER_CHARS and _COVER_HINT_RE.search(text[:first_heading]):
        spans.append(Span(0, first_heading, "Halaman sampul"))

    for m in _FRONT_RE.finditer(text):
        if m.start() > len(text) * 0.4:
            break  # front matter lives at the front
        end = _next_heading_after(text, m.end(), _FRONT_RE, _CONTENTS_RE, _CONTENT_START_RE) or len(text)
        if end - m.start() <= MAX_FRONT_MATTER_CHARS:
            spans.append(Span(m.start(), end, "Kata pengantar / lembar pengesahan"))

    for m in _CONTENTS_RE.finditer(text):
        if m.start() > len(text) * 0.4:
            break
        end = _toc_span(text, m)
        if end - m.start() <= MAX_FRONT_MATTER_CHARS:
            spans.append(Span(m.start(), end, "Daftar isi"))

    bib = [m for m in _BIB_RE.finditer(text) if m.start() >= len(text) * 0.5]
    if bib:
        m = bib[-1]
        end = _next_heading_after(text, m.end(), _APPENDIX_RE) or len(text)
        spans.append(Span(m.start(), end, "Daftar pustaka"))

    merged = _merge(spans)
    if sum(s.length for s in merged) > len(text) * MAX_SKIPPED_SHARE:
        return []
    return merged


def _merge(spans: list[Span]) -> list[Span]:
    out: list[Span] = []
    for s in sorted(spans, key=lambda s: (s.start, -s.end)):
        if out and s.start < out[-1].end:
            last = out[-1]
            if s.end > last.end:
                out[-1] = Span(last.start, s.end, last.label)
            continue
        out.append(s)
    return out


def repeated_lines(text: str, min_repeats: int = 3) -> frozenset[str]:
    """Short lines that repeat across the document: running headers, footers and page numbers."""
    if not text or len(text) < MIN_REPORT_CHARS:
        return frozenset()
    counts: Counter[str] = Counter()
    for _s, _e, line in _lines(text):
        stripped = line.strip()
        if 0 < len(stripped) <= 80:
            counts[stripped] += 1
    repeated = {line for line, n in counts.items() if n >= min_repeats and len(line.split()) >= 2}
    return frozenset(repeated)


def strip_noise_lines(passage_text: str, noise: frozenset[str]) -> str:
    """Drop running headers/footers and bare page numbers from text sent to the model."""
    kept = [
        line for line in passage_text.split("\n")
        if line.strip() not in noise and not _PAGE_NUMBER_RE.match(line)
    ]
    return "\n".join(kept).strip() or passage_text


def summarize(spans: list[Span]) -> list[dict[str, int | str]]:
    by_label: dict[str, int] = {}
    for s in spans:
        by_label[s.label] = by_label.get(s.label, 0) + s.length
    return [{"label": label, "chars": chars} for label, chars in by_label.items()]


def is_skipped(start: int, end: int, spans: list[Span]) -> bool:
    """A passage is skipped when at least 80% of it lies inside skipped spans."""
    length = max(1, end - start)
    covered = sum(max(0, min(end, s.end) - max(start, s.start)) for s in spans)
    return covered / length >= 0.8
