"""Unit + API tests for the rubric-grounded AI draft pipeline."""

import json
import uuid
from datetime import datetime, timedelta

import pytest

from app.config import settings
from app.models.enums import AssignmentStatus, ClassRole, Role, SubmissionType
from app.models.models import (
    Assignment,
    Class,
    Enrollment,
    EvaluationRun,
    Rubric,
    RubricCriterion,
    Submission,
    SubmissionVersion,
    User,
)
from app.security.passwords import hash_password
from app.security.tokens import create_access_token
from app.services import llm_client
from app.services.anonymizer import anonymize_text, masked_quote_to_regex
from app.services.evaluator_service import EvaluationFailedError, evaluate_submission
from app.services.evidence_service import PASSAGE_MAX_CHARS, split_passages
from app.services.llm_client import LLMResult, parse_json_object

ANSWER = (
    "Nama saya Bagas Pratama, NIM: K3519001. Normalisasi bertujuan mengurangi redundansi data. "
    "Tanpa normalisasi akan muncul anomali update ketika data yang sama disimpan di banyak baris.\n\n"
    "Bentuk normal kedua menghapus ketergantungan parsial pada kunci komposit. "
    "Hubungi saya di 0812-3456-7890 atau bagas@student.uns.ac.id."
)

CRITERIA = [
    {"id": "crit-konsep", "label": "Pemahaman konsep", "description": "Tujuan normalisasi", "maxScore": 10.0, "weight": 30.0},
    {"id": "crit-2nf", "label": "Bentuk normal", "description": "Penerapan 2NF", "maxScore": 10.0, "weight": 70.0},
]


# ---------------------------------------------------------------------------
# Anonymisation
# ---------------------------------------------------------------------------


def test_anonymizer_masks_identity_data():
    masked = anonymize_text(ANSWER, ["Bagas Pratama"])
    assert "Bagas" not in masked
    assert "Pratama" not in masked
    assert "K3519001" not in masked
    assert "0812-3456-7890" not in masked
    assert "bagas@student.uns.ac.id" not in masked
    assert "[MAHASISWA]" in masked
    assert "NIM: [NIM]" in masked
    assert "[TELEPON]" in masked
    assert "[EMAIL]" in masked
    # Academic content stays intact.
    assert "ketergantungan parsial pada kunci komposit" in masked


def test_anonymizer_masks_bare_nim_and_short_name_parts():
    masked = anonymize_text("Dikerjakan oleh Ani (M0521045) dan dicek Ani lagi.", ["Ani Lestari"])
    assert "Ani" not in masked
    assert "M0521045" not in masked
    assert masked.count("[MAHASISWA]") == 2


# ---------------------------------------------------------------------------
# Passages
# ---------------------------------------------------------------------------


def test_split_passages_offsets_are_exact_and_respect_paragraphs():
    passages = split_passages(ANSWER)
    assert passages, "expected at least one passage"
    assert [p.id for p in passages] == [f"P{i + 1}" for i in range(len(passages))]
    for p in passages:
        assert ANSWER[p.start : p.end] == p.text
        assert len(p.text) <= PASSAGE_MAX_CHARS
    paragraph_break = ANSWER.index("\n\n")
    for p in passages:
        assert not (p.start < paragraph_break < p.end), "passage must not cross a blank-line paragraph"


def test_split_passages_hard_splits_long_sentences():
    long_text = ("kata " * 400).strip() + "."
    passages = split_passages(long_text)
    assert len(passages) > 1
    for p in passages:
        assert long_text[p.start : p.end] == p.text
        assert len(p.text) <= PASSAGE_MAX_CHARS


def test_split_passages_crlf_and_empty():
    assert split_passages("   \n  ") == []
    text = "Kalimat satu.\r\n\r\nKalimat dua."
    passages = split_passages(text)
    assert [p.text for p in passages] == ["Kalimat satu.", "Kalimat dua."]
    for p in passages:
        assert text[p.start : p.end] == p.text


# ---------------------------------------------------------------------------
# Quote mapping
# ---------------------------------------------------------------------------


def test_masked_quote_maps_back_to_original_text():
    pattern = masked_quote_to_regex("Nama saya [MAHASISWA], NIM: [NIM]. Normalisasi bertujuan")
    match = pattern.search(ANSWER)
    assert match is not None
    assert ANSWER[match.start() : match.end()].startswith("Nama saya Bagas Pratama")


def test_masked_quote_strips_edge_tokens_and_is_flexible():
    pattern = masked_quote_to_regex("[MAHASISWA] normalisasi   BERTUJUAN mengurangi [NIM]")
    match = pattern.search(ANSWER)
    assert match is not None
    assert ANSWER[match.start() : match.end()] == "Normalisasi bertujuan mengurangi"


def test_empty_quote_never_matches():
    assert masked_quote_to_regex("").search(ANSWER) is None
    assert masked_quote_to_regex("   ").search(ANSWER) is None
    assert masked_quote_to_regex("[MAHASISWA]").search(ANSWER) is None


def test_parse_json_object_tolerates_fences():
    assert parse_json_object('```json\n{"a": 1}\n```') == {"a": 1}
    assert parse_json_object('Berikut hasilnya: {"a": 2} selesai') == {"a": 2}
    with pytest.raises(ValueError):
        parse_json_object("tidak ada json")


# ---------------------------------------------------------------------------
# Evaluator guards
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_hallucinated_quotes_dropped_and_weighted_total(monkeypatch):
    monkeypatch.setenv("TEST_MOCK_LLM", "false")
    captured: dict = {}

    async def fake_chat_json(system, user, schema=None):
        captured["user"] = user
        return LLMResult(
            content={
                "perCriterion": [
                    {
                        # Model returned the label instead of the id: must still map.
                        "criterionId": "Pemahaman konsep",
                        "score": 8,
                        "confidence": "high",
                        "reasoning": "Tujuan dijelaskan.",
                        "feedback": "Baik.",
                        "evidence": [
                            {"passageId": "P1", "quote": "Normalisasi bertujuan mengurangi redundansi data."},
                            {"passageId": "P1", "quote": "Normalisasi menjamin performa query selalu naik."},
                        ],
                    },
                    {
                        "criterionId": "crit-2nf",
                        "score": 15,  # above max: must clamp to 10
                        "confidence": "high",
                        "reasoning": "-",
                        "feedback": "-",
                        "evidence": [{"passageId": "P9", "quote": "2NF dijelaskan dengan contoh tabel KRS lengkap."}],
                    },
                ],
                "suggestedFeedback": "Secara umum baik.",
            },
            provider="ollama",
            model="fake-model",
        )

    monkeypatch.setattr(llm_client, "chat_json", fake_chat_json)

    result = await evaluate_submission(
        assignment_title="Esai",
        assignment_instructions="Jelaskan normalisasi",
        assignment_max_score=100.0,
        criteria=CRITERIA,
        student_answer=ANSWER,
        student_names=["Bagas Pratama"],
    )

    # The model never saw identity data.
    assert "Bagas" not in captured["user"]
    assert "K3519001" not in captured["user"]

    per = {pc["criterionId"]: pc for pc in result["response"]["perCriterion"]}
    konsep = per["crit-konsep"]
    assert konsep["score"] == 8
    assert len(konsep["evidence"]) == 1
    ev = konsep["evidence"][0]
    assert ANSWER[ev["start"] : ev["end"]] == "Normalisasi bertujuan mengurangi redundansi data."
    assert konsep["needsReview"] is False

    nf = per["crit-2nf"]
    assert nf["score"] == 10.0
    assert nf["evidence"] == []
    assert nf["confidence"] == "low"
    assert nf["needsReview"] is True

    cfg = result["evaluatorConfig"]
    assert cfg["unverifiedQuotesDropped"] == 2
    assert cfg["missingCriteria"] == []
    assert cfg["anonymized"] is True
    # 0.3 × 8/10 × 100 + 0.7 × 10/10 × 100 = 24 + 70
    assert result["response"]["suggestedTotalScore"] == pytest.approx(94.0)


@pytest.mark.asyncio
async def test_missing_criterion_scored_zero_and_flagged(monkeypatch):
    monkeypatch.setenv("TEST_MOCK_LLM", "false")

    async def fake_chat_json(system, user, schema=None):
        return LLMResult(
            content={
                "perCriterion": [
                    {
                        "criterionId": "crit-konsep",
                        "score": 10,
                        "confidence": "medium",
                        "reasoning": "ok",
                        "feedback": "ok",
                        "evidence": [{"passageId": "P1", "quote": "Normalisasi bertujuan mengurangi redundansi data."}],
                    }
                ],
                "suggestedFeedback": "",
            },
            provider="ollama",
            model="fake-model",
        )

    monkeypatch.setattr(llm_client, "chat_json", fake_chat_json)
    result = await evaluate_submission("Esai", "x", 100.0, CRITERIA, ANSWER)
    per = {pc["criterionId"]: pc for pc in result["response"]["perCriterion"]}
    assert per["crit-2nf"]["score"] == 0
    assert per["crit-2nf"]["needsReview"] is True
    assert result["evaluatorConfig"]["missingCriteria"] == ["crit-2nf"]
    assert result["response"]["suggestedTotalScore"] == pytest.approx(30.0)


@pytest.mark.asyncio
async def test_llm_offline_fails_cleanly(monkeypatch):
    monkeypatch.setenv("TEST_MOCK_LLM", "false")
    monkeypatch.setattr(settings, "LLM_PROVIDER", "ollama")
    monkeypatch.setattr(settings, "OLLAMA_BASE_URL", "http://127.0.0.1:9")
    monkeypatch.setattr(settings, "LLM_MAX_RETRIES", 0)
    monkeypatch.setattr(settings, "LLM_TIMEOUT_SECONDS", 3.0)

    with pytest.raises(EvaluationFailedError) as exc_info:
        await evaluate_submission("Esai", "x", 100.0, CRITERIA, ANSWER)
    assert "Ollama" in str(exc_info.value)


# ---------------------------------------------------------------------------
# API: no draft is stored when the model is unavailable
# ---------------------------------------------------------------------------


@pytest.fixture
def graded_env(db_session):
    uid = uuid.uuid4().hex[:8]
    dosen = User(email=f"dosen_pipe_{uid}@example.com", name="Dosen Pipe", role=Role.DOSEN, passwordHash=hash_password("x" * 12))
    mhs = User(email=f"mhs_pipe_{uid}@example.com", name="Bagas Pratama", role=Role.MAHASISWA, passwordHash=hash_password("x" * 12))
    db_session.add_all([dosen, mhs])
    db_session.commit()
    cls = Class(name="Kelas Pipe", dosenId=dosen.id, enrollmentKey=f"PP{uid[:6].upper()}")
    db_session.add(cls)
    db_session.commit()
    db_session.add(Enrollment(classId=cls.id, mahasiswaId=mhs.id, role=ClassRole.STUDENT))
    rubric = Rubric(classId=cls.id, title="Rubrik Pipe", createdById=dosen.id)
    db_session.add(rubric)
    db_session.commit()
    crits = [
        RubricCriterion(rubricId=rubric.id, label="Pemahaman konsep", maxScore=10.0, weight=30.0),
        RubricCriterion(rubricId=rubric.id, label="Bentuk normal", maxScore=10.0, weight=70.0),
    ]
    db_session.add_all(crits)
    assignment = Assignment(
        classId=cls.id,
        title="Esai Pipe",
        instructions="Jelaskan normalisasi",
        submissionType=SubmissionType.ANY,
        status=AssignmentStatus.PUBLISHED,
        dueDate=datetime.now() + timedelta(days=7),
        maxScore=100.0,
        rubricId=rubric.id,
    )
    db_session.add(assignment)
    db_session.commit()
    sub = Submission(assignmentId=assignment.id, mahasiswaId=mhs.id)
    db_session.add(sub)
    db_session.commit()
    ver = SubmissionVersion(submissionId=sub.id, versionNumber=1, type=SubmissionType.TEXT, content=ANSWER)
    db_session.add(ver)
    db_session.commit()
    sub.activeVersionId = ver.id
    db_session.commit()
    token = create_access_token({"sub": dosen.id, "email": dosen.email, "role": dosen.role.value})
    mhs_token = create_access_token({"sub": mhs.id, "email": mhs.email, "role": mhs.role.value})
    return {"sub": sub, "ver": ver, "crits": crits, "token": token, "mhs_token": mhs_token, "cls": cls, "assignment": assignment}


def _offline(monkeypatch):
    monkeypatch.setenv("TEST_MOCK_LLM", "false")
    monkeypatch.setattr(settings, "LLM_PROVIDER", "ollama")
    monkeypatch.setattr(settings, "OLLAMA_BASE_URL", "http://127.0.0.1:9")
    monkeypatch.setattr(settings, "LLM_MAX_RETRIES", 0)


def test_grade_endpoint_returns_503_and_stores_nothing_when_offline(client, graded_env, db_session, monkeypatch):
    _offline(monkeypatch)
    sub_id = graded_env["sub"].id
    res = client.post(f"/submissions/{sub_id}/grade", headers={"Authorization": f"Bearer {graded_env['token']}"})
    assert res.status_code == 503
    assert "Draf AI tidak dapat dibuat" in res.json()["detail"]
    assert db_session.query(EvaluationRun).filter(EvaluationRun.submissionId == sub_id).count() == 0


def test_stream_emits_error_and_stores_nothing_when_offline(client, graded_env, db_session, monkeypatch):
    _offline(monkeypatch)
    sub_id = graded_env["sub"].id
    res = client.get(f"/submissions/{sub_id}/grade/stream", headers={"Authorization": f"Bearer {graded_env['token']}"})
    assert res.status_code == 200
    assert "event: error" in res.text
    assert "event: done" not in res.text
    assert db_session.query(EvaluationRun).filter(EvaluationRun.submissionId == sub_id).count() == 0


def test_mock_draft_has_verified_evidence_and_snapshot(client, graded_env, db_session):
    sub_id = graded_env["sub"].id
    res = client.post(f"/submissions/{sub_id}/grade", headers={"Authorization": f"Bearer {graded_env['token']}"})
    assert res.status_code == 200
    ev = res.json()["aiEvaluation"]
    assert ev["rubricVersionSnapshot"]["criteria"][0]["label"] == "Pemahaman konsep"
    for pc in ev["perCriterionScore"]:
        for quote in pc["evidence"]:
            assert ANSWER[quote["start"] : quote["end"]] == quote["quote"]


def test_finalize_with_per_criterion_recomputes_weighted_total(client, graded_env, db_session):
    env = graded_env
    headers = {"Authorization": f"Bearer {env['token']}"}
    ai = client.post(f"/submissions/{env['sub'].id}/grade", headers=headers).json()["aiEvaluation"]
    c1, c2 = env["crits"]

    base = {
        "expectedSubmissionVersionId": env["ver"].id,
        "expectedReleasedGradeId": None,
        "finalScore": 1.0,  # ignored: server recomputes from criteria
        "finalFeedback": "Bagus, perjelas contoh 2NF.",
        "evaluationRunId": ai["id"],
    }

    too_high = client.post(
        f"/submissions/{env['sub'].id}/finalize",
        headers=headers,
        json={**base, "perCriterion": [
            {"criterionId": c1.id, "aiScore": 8.5, "finalScore": 11, "decision": "edited"},
            {"criterionId": c2.id, "aiScore": 8.5, "finalScore": 5, "decision": "edited"},
        ]},
    )
    assert too_high.status_code == 400

    foreign = client.post(
        f"/submissions/{env['sub'].id}/finalize",
        headers=headers,
        json={**base, "perCriterion": [{"criterionId": "not-in-rubric", "finalScore": 5, "decision": "manual"}]},
    )
    assert foreign.status_code == 400

    ok = client.post(
        f"/submissions/{env['sub'].id}/finalize",
        headers=headers,
        json={**base, "perCriterion": [
            {"criterionId": c1.id, "aiScore": 8.5, "finalScore": 8.5, "decision": "accepted", "finalFeedback": "Tepat."},
            {"criterionId": c2.id, "aiScore": 8.5, "finalScore": 5, "decision": "edited", "finalFeedback": "Contoh kurang."},
        ]},
    )
    assert ok.status_code == 200, ok.text
    grade = ok.json()["grade"]
    # 0.3 × 0.85 × 100 + 0.7 × 0.5 × 100 = 25.5 + 35
    assert grade["finalScore"] == pytest.approx(60.5)
    assert grade["evaluationRunId"] == ai["id"]
    assert grade["editedFromAI"] is True

    # Student sees lecturer-final criteria only.
    result = client.get(
        f"/classes/{env['cls'].id}/assignments/{env['assignment'].id}/result",
        headers={"Authorization": f"Bearer {env['mhs_token']}"},
    ).json()
    criteria = {c["criterionId"]: c for c in result["grade"]["criteria"]}
    assert criteria[c2.id] == {"criterionId": c2.id, "finalScore": 5, "finalFeedback": "Contoh kurang."}
    assert "aiScore" not in json.dumps(result)

    analytics = client.get("/analytics", headers=headers).json()
    assert analytics["gradesCount"] == 1
    assert analytics["decisionCounts"]["accepted"] == 1
    assert analytics["decisionCounts"]["edited"] == 1
    assert analytics["meanAbsoluteDeviation"] == pytest.approx(abs(85.0 - 60.5))
