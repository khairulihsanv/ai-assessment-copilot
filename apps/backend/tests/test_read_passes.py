"""A long answer that does not fit one prompt is read in several passes."""

import re

import pytest

from app.config import settings
from app.services import evaluator_service, llm_client
from app.services.evaluator_service import TokenPacer, evaluate_submission
from app.services.llm_client import LLMResult

ANSWER = (
    "Nama saya Bagas Pratama, NIM: K3519001. Normalisasi bertujuan mengurangi redundansi data. "
    "Tanpa normalisasi akan muncul anomali update ketika data yang sama disimpan di banyak baris.\n\n"
    "Bentuk normal kedua menghapus ketergantungan parsial pada kunci komposit."
)
CRITERIA = [
    {"id": "crit-konsep", "label": "Pemahaman konsep", "description": "Tujuan normalisasi", "maxScore": 10.0, "weight": 30.0},
    {"id": "crit-2nf", "label": "Bentuk normal", "description": "Penerapan 2NF", "maxScore": 10.0, "weight": 70.0},
]
LONG_FILLER = "\n\n".join(
    f"Paragraf {i} membahas sejarah basis data relasional dan tokoh-tokohnya. " * 4 for i in range(40)
)
LONG_ANSWER = ANSWER + "\n\n" + LONG_FILLER
FOLLOW_UP_MARK = "PUTARAN BACA KE-"


def _llm(prompts: list[str], first: dict, later: dict, usage: int = 0):
    """First pass scores with ``first``, later passes with ``later``: {criterionId: (score, quote)}."""

    async def fake_chat_json(system, user, schema=None):
        prompts.append(user)
        follow_up = FOLLOW_UP_MARK in user
        scores = later if follow_up else first
        return LLMResult(
            content={
                "perCriterion": [
                    {
                        "criterionId": cid,
                        "score": score,
                        "confidence": "high",
                        "reasoning": "Alasan.",
                        "feedback": "Masukan.",
                        "evidence": [{"passageId": "P1", "quote": quote}] if quote else [],
                    }
                    for cid, (score, quote) in scores.items()
                ],
                "suggestedFeedback": "Lanjutan." if follow_up else "Awal.",
            },
            provider="groq",
            model="fake-model",
            usage={"promptTokens": usage, "completionTokens": 0, "totalTokens": usage},
        )

    return fake_chat_json


@pytest.fixture
def small_budget(monkeypatch):
    monkeypatch.setenv("TEST_MOCK_LLM", "false")
    monkeypatch.setattr(settings, "LLM_MAX_PROMPT_TOKENS", 1500)
    monkeypatch.setattr(settings, "LLM_MAX_READ_PASSES", 50)


@pytest.mark.asyncio
async def test_long_answer_is_read_in_passes_until_everything_is_seen(monkeypatch, small_budget):
    prompts: list[str] = []
    identity = "Nama saya Bagas Pratama, NIM: K3519001."
    monkeypatch.setattr(
        llm_client,
        "chat_json",
        _llm(
            prompts,
            first={"crit-konsep": (8, identity), "crit-2nf": (6, None)},
            # A later pass may raise a score, never lower one.
            later={
                "crit-konsep": (3, None),
                "crit-2nf": (10, "Bentuk normal kedua menghapus ketergantungan parsial pada kunci komposit."),
            },
        ),
    )
    progress: list[str] = []

    result = await evaluate_submission(
        "Esai", "x", 100.0, CRITERIA, LONG_ANSWER, student_names=["Bagas Pratama"], on_progress=progress.append
    )

    cfg = result["evaluatorConfig"]
    assert cfg["readPasses"] == len(prompts) > 1
    assert cfg["passagesSent"] == cfg["passagesTotal"]
    assert cfg["condensed"] is False
    assert cfg["readError"] is None
    # Every passage reached the model exactly once, and every pass stayed inside the budget.
    seen = [pid for p in prompts for pid in re.findall(r"^\[(P\d+)\]", p, re.MULTILINE)]
    assert len(seen) == len(set(seen)) == cfg["passagesTotal"]
    assert cfg["promptTokensEstimate"] <= 1500
    # The draft carried into later passes is anonymised too.
    for p in prompts:
        assert "Bagas" not in p and "K3519001" not in p
    assert all("DRAF SEMENTARA: skor 8" in p for p in prompts[1:])

    per = {pc["criterionId"]: pc for pc in result["response"]["perCriterion"]}
    assert per["crit-konsep"]["score"] == 8
    assert per["crit-2nf"]["score"] == 10
    assert per["crit-2nf"]["evidence"] and per["crit-2nf"]["needsReview"] is False
    assert all("Jawaban panjang" not in pc["reasoning"] for pc in per.values())
    assert result["response"]["suggestedTotalScore"] == pytest.approx(0.3 * 80 + 0.7 * 100)
    assert result["response"]["suggestedFeedback"] == "Lanjutan."
    assert progress[0] == "Model membaca lanjutan jawaban (putaran 2)…"


@pytest.mark.asyncio
async def test_failed_reading_pass_keeps_the_draft_and_flags_the_rest(monkeypatch, small_budget):
    ok = _llm([], first={"crit-konsep": (8, None), "crit-2nf": (6, None)}, later={})

    async def flaky(system, user, schema=None):
        if FOLLOW_UP_MARK in user:
            raise llm_client.LLMUnavailableError("Groq: kuota model untuk hari ini habis (HTTP 429).")
        return await ok(system, user, schema)

    monkeypatch.setattr(llm_client, "chat_json", flaky)

    result = await evaluate_submission("Esai", "x", 100.0, CRITERIA, LONG_ANSWER)

    cfg = result["evaluatorConfig"]
    assert result["status"] == "COMPLETED"
    assert cfg["readPasses"] == 1
    assert "kuota" in cfg["readError"]
    assert cfg["passagesSent"] < cfg["passagesTotal"]
    assert cfg["condensed"] is True


@pytest.mark.asyncio
async def test_reading_passes_wait_for_the_groq_token_window(monkeypatch, small_budget):
    monkeypatch.setattr(settings, "LLM_PROVIDER", "groq")
    monkeypatch.setattr(settings, "LLM_MAX_READ_PASSES", 3)
    monkeypatch.setattr(settings, "LLM_TOKENS_PER_MINUTE", None)  # Groq default: 8000
    waits: list[float] = []

    async def no_sleep(seconds):
        waits.append(seconds)

    monkeypatch.setattr(evaluator_service, "_sleep", no_sleep)
    monkeypatch.setattr(
        llm_client, "chat_json", _llm([], first={"crit-konsep": (8, None), "crit-2nf": (6, None)}, later={}, usage=6000)
    )
    progress: list[str] = []

    result = await evaluate_submission("Esai", "x", 100.0, CRITERIA, LONG_ANSWER, on_progress=progress.append)

    # 6000 tokens per pass plus the next prompt do not fit in 8000 per minute: each later pass waits.
    assert len(waits) == 2 and all(50 < w <= 61 for w in waits)
    assert result["evaluatorConfig"]["rateLimitWaitSeconds"] == pytest.approx(sum(waits), abs=0.2)
    assert any(m.startswith("Menunggu kuota model") for m in progress)


@pytest.mark.asyncio
async def test_single_pass_setting_keeps_the_old_behaviour(monkeypatch, small_budget):
    monkeypatch.setattr(settings, "LLM_MAX_READ_PASSES", 1)
    prompts: list[str] = []
    monkeypatch.setattr(llm_client, "chat_json", _llm(prompts, first={"crit-konsep": (8, None), "crit-2nf": (6, None)}, later={}))

    result = await evaluate_submission("Esai", "x", 100.0, CRITERIA, LONG_ANSWER)

    assert len(prompts) == 1
    assert result["evaluatorConfig"]["condensed"] is True


def test_token_pacer_counts_a_sliding_minute():
    pacer = TokenPacer(8000)
    assert pacer.wait_seconds(5000, now=0.0) == 0.0
    pacer.record(5000, now=0.0)
    assert pacer.wait_seconds(2000, now=5.0) == 0.0
    assert pacer.wait_seconds(5000, now=10.0) == pytest.approx(51.0)
    assert pacer.wait_seconds(5000, now=61.0) == 0.0
    assert TokenPacer(None).wait_seconds(99999, now=0.0) == 0.0
