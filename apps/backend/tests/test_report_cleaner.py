"""Boilerplate detection for long reports. Spans, never edits: offsets must stay valid."""

from app.services.report_cleaner import (
    MIN_REPORT_CHARS,
    find_boilerplate,
    is_skipped,
    repeated_lines,
    strip_noise_lines,
    summarize,
)

BODY = "\n\n".join(
    f"Paragraf {i}: Normalisasi bertujuan mengurangi redundansi data dan anomali pembaruan pada tabel." for i in range(80)
)


def report(cover: bool = True, preface: bool = True, toc: bool = True, bib: bool = True) -> str:
    parts = []
    if cover:
        parts.append("LAPORAN PRAKTIKUM\nDisusun oleh:\nAni\nNIM 123\nUNIVERSITAS CONTOH\n")
    if preface:
        parts.append("KATA PENGANTAR\nPuji syukur atas selesainya laporan ini.\n")
    if toc:
        parts.append("DAFTAR ISI\nBAB I PENDAHULUAN ........ 1\nBAB II DASAR TEORI ........ 3\nDAFTAR PUSTAKA ........ 9\n")
    parts.append("BAB I PENDAHULUAN\n" + BODY)
    if bib:
        parts.append("\nDAFTAR PUSTAKA\nDate, C. J. (2004). An Introduction to Database Systems.\n")
    return "\n".join(parts)


def labels(text: str) -> list[str]:
    return [s.label for s in find_boilerplate(text)]


def test_finds_cover_preface_toc_and_bibliography():
    text = report()
    spans = find_boilerplate(text)
    assert [s.label for s in spans] == [
        "Halaman sampul",
        "Kata pengantar / lembar pengesahan",
        "Daftar isi",
        "Daftar pustaka",
    ]
    skipped = "".join(text[s.start : s.end] for s in spans)
    assert "Puji syukur" in skipped and "Date, C. J." in skipped and "........ 3" in skipped
    assert "Paragraf 5:" not in skipped
    assert "BAB I PENDAHULUAN\nParagraf 0" in text[spans[2].end :]


def test_short_essay_is_left_alone():
    essay = "KATA PENGANTAR\nhalo\n\nDAFTAR PUSTAKA\nbuku"
    assert len(essay) < MIN_REPORT_CHARS
    assert find_boilerplate(essay) == []
    assert repeated_lines(essay) == frozenset()


def test_table_of_contents_lines_in_the_body_are_not_headings():
    # "DAFTAR PUSTAKA ........ 9" inside the table of contents is not the bibliography.
    text = report(bib=False)
    assert "Daftar pustaka" not in labels(text)


def test_bibliography_mentioned_early_is_not_skipped():
    text = "DAFTAR PUSTAKA\nbuku\n\n" + BODY
    assert "Daftar pustaka" not in labels(text)


def test_never_skips_most_of_the_answer():
    text = "KATA PENGANTAR\n" + ("terima kasih. " * 400) + "\n\nDAFTAR PUSTAKA\n" + ("Buku. " * 2000)
    assert find_boilerplate(text) == []


def test_running_headers_and_page_numbers_are_stripped_from_prompt_text():
    text = "\n".join(f"Laporan Praktikum Basis Data\nisi halaman {i} cukup panjang untuk laporan.\n{i}" for i in range(60))
    noise = repeated_lines(text)
    assert "Laporan Praktikum Basis Data" in noise
    cleaned = strip_noise_lines("Laporan Praktikum Basis Data\nisi halaman 3 cukup panjang.\n3", noise)
    assert cleaned == "isi halaman 3 cukup panjang."


def test_is_skipped_needs_most_of_the_passage_inside_a_span():
    spans = find_boilerplate(report())
    bib = spans[-1]
    assert is_skipped(bib.start, bib.end, spans)
    assert not is_skipped(bib.start - 500, bib.start + 10, spans)


def test_summary_counts_characters_per_section():
    summary = summarize(find_boilerplate(report()))
    assert {s["label"] for s in summary} == {
        "Halaman sampul",
        "Kata pengantar / lembar pengesahan",
        "Daftar isi",
        "Daftar pustaka",
    }
    assert all(int(s["chars"]) > 0 for s in summary)
