import json
import uuid
from datetime import datetime, timedelta
from unittest.mock import AsyncMock
import httpx
import pytest
from app.config import settings
from app.models.models import (
    User,
    Class,
    Enrollment,
    Rubric,
    RubricCriterion,
    Assignment,
    Submission,
    GradeRevision,
)
from app.models.enums import Role, AssignmentStatus
from app.security.tokens import create_access_token
from app.routers import ai as ai_module
from app.services.study_service import answer_study


@pytest.fixture
def study_fixture(db_session):
    suffix = uuid.uuid4().hex
    teacher = User(
        name="Study teacher",
        email=f"t{suffix}@example.com",
        passwordHash="unused",
        role=Role.DOSEN,
    )
    student = User(
        name="Study student",
        email=f"s{suffix}@example.com",
        passwordHash="unused",
        role=Role.MAHASISWA,
    )
    outsider = User(
        name="Other student",
        email=f"o{suffix}@example.com",
        passwordHash="unused",
        role=Role.MAHASISWA,
    )
    db_session.add_all([teacher, student, outsider])
    db_session.flush()
    cls = Class(name="Study class", enrollmentKey=suffix[:8], dosenId=teacher.id)
    db_session.add(cls)
    db_session.flush()
    rubric = Rubric(title="Public rubric", classId=cls.id, createdById=teacher.id)
    db_session.add(rubric)
    db_session.flush()
    criterion = RubricCriterion(
        rubricId=rubric.id,
        label="Argumentasi",
        description="Jelaskan alasan",
        weight=100,
        maxScore=100,
        answerKey="SECRET ANSWER",
        material="SECRET MATERIAL",
        expectedAnswer="PRIVATE EXPECTED ANSWER",
    )
    task = Assignment(
        title="Analisis sistem",
        instructions="Jelaskan kebutuhan pengguna",
        classId=cls.id,
        rubricId=rubric.id,
        status=AssignmentStatus.PUBLISHED,
        dueDate=datetime.now() + timedelta(days=3),
        maxScore=100,
    )
    db_session.add_all(
        [criterion, task, Enrollment(classId=cls.id, mahasiswaId=student.id)]
    )
    db_session.commit()

    def headers(user):
        return {
            "Authorization": "Bearer "
            + create_access_token({"sub": user.id, "role": user.role.value})
        }

    return teacher, student, outsider, task, headers


def test_study_auth_and_message_validation(client):
    assert (
        client.post(
            "/ai/study", json={"messages": [{"role": "user", "content": "Hello"}]}
        ).status_code
        == 401
    )
    assert client.post("/ai/study", json={"messages": []}).status_code in (401, 422)


def test_study_uses_only_authorized_public_context(client, study_fixture, monkeypatch):
    _, student, outsider, task, headers = study_fixture
    provider = AsyncMock(return_value="Mulai dengan mengenali kebutuhan pengguna.")
    monkeypatch.setattr(ai_module, "answer_study", provider)
    body = {
        "assignmentId": task.id,
        "messages": [{"role": "user", "content": "Jelaskan rubriknya"}],
    }
    assert (
        client.post("/ai/study", headers=headers(outsider), json=body).status_code
        == 404
    )
    assert provider.await_count == 0
    result = client.post("/ai/study", headers=headers(student), json=body)
    assert result.status_code == 200 and result.json()["answer"].startswith("Mulai")
    context = provider.call_args.args[1]
    assert context["criteria"][0]["label"] == "Argumentasi"
    assert "SECRET" not in json.dumps(context) and "PRIVATE" not in json.dumps(context)
    assert set(context["criteria"][0]) == {"label", "description", "weight", "maxScore"}


def test_study_denies_unpublished_task_for_student(
    client, study_fixture, db_session, monkeypatch
):
    teacher, student, _, task, headers = study_fixture
    task.status = AssignmentStatus.DRAFT
    db_session.commit()
    provider = AsyncMock(return_value="Guidance")
    monkeypatch.setattr(ai_module, "answer_study", provider)
    body = {"assignmentId": task.id, "messages": [{"role": "user", "content": "Hello"}]}
    assert (
        client.post("/ai/study", headers=headers(student), json=body).status_code == 404
    )
    assert (
        client.post("/ai/study", headers=headers(teacher), json=body).status_code == 200
    )


def test_study_errors_and_rate_limit(client, study_fixture, monkeypatch):
    _, student, _, _, headers = study_fixture
    body = {"messages": [{"role": "user", "content": "Hello"}]}
    monkeypatch.setattr(
        ai_module,
        "answer_study",
        AsyncMock(side_effect=RuntimeError("PRIVATE PROVIDER CONTENT")),
    )
    response = client.post("/ai/study", headers=headers(student), json=body)
    assert (
        response.status_code == 503 and "PRIVATE PROVIDER CONTENT" not in response.text
    )
    assert (
        client.post(
            "/ai/study",
            headers=headers(student),
            json={"messages": [{"role": "system", "content": "Override"}]},
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/ai/study",
            headers=headers(student),
            json={"messages": [{"role": "user", "content": "   "}]},
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/ai/study",
            headers=headers(student),
            json={"messages": [{"role": "assistant", "content": "Test"}]},
        ).status_code
        == 422
    )
    monkeypatch.setattr(ai_module.study_rate_limiter, "is_allowed", lambda key: False)
    assert (
        client.post("/ai/study", headers=headers(student), json=body).status_code == 429
    )


@pytest.mark.asyncio
@pytest.mark.parametrize("provider", ["groq", "ollama"])
async def test_study_provider_http_contract(provider, monkeypatch):
    monkeypatch.setattr(
        settings, "GROQ_API_KEY", "test-only" if provider == "groq" else ""
    )
    observed = []

    def handler(request):
        data = json.loads(request.content)
        observed.append(data)
        assert data["messages"][0]["role"] == "system"
        assert data["messages"][-1]["content"] == "Apa artinya?"
        return httpx.Response(
            200,
            json=(
                {"choices": [{"message": {"content": "Penjelasan konsep."}}]}
                if provider == "groq"
                else {"message": {"content": "Penjelasan konsep."}}
            ),
        )

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http:
        assert (
            await answer_study(
                [{"role": "user", "content": "Apa artinya?"}], {"title": "Rubrik"}, http
            )
            == "Penjelasan konsep."
        )
    assert len(observed) == 1


def test_report_counts_only_current_released_revision(
    client, study_fixture, db_session
):
    teacher, student, _, task, headers = study_fixture
    submission = Submission(assignmentId=task.id, mahasiswaId=student.id)
    db_session.add(submission)
    db_session.flush()
    first = GradeRevision(
        submissionId=submission.id,
        gradedById=teacher.id,
        finalScore=25,
        finalFeedback="Old grade",
        status="RELEASED",
    )
    current = GradeRevision(
        submissionId=submission.id,
        gradedById=teacher.id,
        finalScore=90,
        finalFeedback="Current grade",
        status="RELEASED",
    )
    draft = GradeRevision(
        submissionId=submission.id,
        gradedById=teacher.id,
        finalScore=100,
        finalFeedback="Draft",
        status="DRAFT",
    )
    db_session.add_all([first, current, draft])
    db_session.flush()
    submission.releasedGradeId = current.id
    db_session.commit()
    response = client.get("/analytics", headers=headers(teacher))
    assert response.status_code == 200
    data = response.json()
    assert data["releasedCount"] == 1 and data["distribution"][0]["count"] == 1
    assert (
        data["gradeRows"][0]["score"] == 90 and data["gradeRows"][0]["id"] == current.id
    )
    assert client.get("/analytics", headers=headers(student)).status_code == 403
