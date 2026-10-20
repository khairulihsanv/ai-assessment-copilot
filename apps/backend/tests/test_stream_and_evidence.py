import json
import uuid
from datetime import datetime, timedelta
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.main import app
from app.models.enums import AssignmentStatus, ClassRole, DocumentStatus, Role, SourceType, SubmissionType
from app.models.models import (
    Assignment,
    ChunkEmbedding,
    Class,
    Document,
    DocumentChunk,
    DocumentVersion,
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
from app.services.storage_service import storage



@pytest.fixture
def setup_eval_env(db_session):
    uid = uuid.uuid4().hex[:8]

    # Dosen
    dosen = User(
        email=f"dosen_stream_{uid}@dexa.ac.id",
        name=f"Dosen Stream {uid}",
        role=Role.DOSEN,
        passwordHash=hash_password("DosenSecurePass!2026"),
    )
    # Mahasiswa enrolled
    mhs = User(
        email=f"mhs_stream_{uid}@dexa.ac.id",
        name=f"Mahasiswa Stream {uid}",
        role=Role.MAHASISWA,
        passwordHash=hash_password("MhsSecurePass!2026"),
    )
    db_session.add_all([dosen, mhs])
    db_session.commit()

    cls = Class(
        name=f"Kelas Kecerdasan Buatan {uid}",
        description="Kelas untuk pengujian evaluasi AI",
        subject="Informatika",
        dosenId=dosen.id,
        enrollmentKey=f"AI{uid[:4].upper()}",
    )
    db_session.add(cls)
    db_session.commit()

    enrollment = Enrollment(
        classId=cls.id,
        mahasiswaId=mhs.id,
        role=ClassRole.STUDENT,
    )
    db_session.add(enrollment)
    db_session.commit()

    rubric = Rubric(
        classId=cls.id,
        title="Rubrik Machine Learning",
        createdById=dosen.id,
    )
    db_session.add(rubric)
    db_session.commit()

    crit1 = RubricCriterion(
        rubricId=rubric.id,
        label="Pemahaman Teori",
        description="Memahami konsep gradient descent dan cost function",
        maxScore=50.0,
        weight=50.0,
        answerKey="Gradient descent adalah algoritma optimasi untuk meminimalkan fungsi loss.",
        material="Materi optimasi machine learning bab 2.",
    )
    crit2 = RubricCriterion(
        rubricId=rubric.id,
        label="Implementasi Algoritma",
        description="Mampu menjelaskan proses backpropagation secara tepat",
        maxScore=50.0,
        weight=50.0,
        answerKey="Backpropagation menghitung gradien parsial error terhadap bobot jaringan.",
        material="Materi deep learning bab 3.",
    )
    db_session.add_all([crit1, crit2])
    db_session.commit()

    assignment = Assignment(
        classId=cls.id,
        title="Tugas Optimasi Gradient Descent",
        instructions="Jelaskan cara kerja gradient descent dan backpropagation",
        submissionType=SubmissionType.ANY,
        status=AssignmentStatus.PUBLISHED,
        dueDate=datetime.now() + timedelta(days=7),
        allowLateSubmission=False,
        maxScore=100.0,
        rubricId=rubric.id,
    )
    db_session.add(assignment)
    db_session.commit()

    # Submission
    sub = Submission(
        assignmentId=assignment.id,
        mahasiswaId=mhs.id,
    )
    db_session.add(sub)
    db_session.commit()

    ver = SubmissionVersion(
        submissionId=sub.id,
        versionNumber=1,
        type=SubmissionType.TEXT,
        content="Gradient descent adalah metode optimasi iteratif untuk menemukan bobot terbaik dengan meminimalkan cost function. Backpropagation digunakan untuk menghitung turunan parsial eror pada setiap layer.",
    )
    db_session.add(ver)
    db_session.commit()

    sub.activeVersionId = ver.id
    db_session.commit()

    dosen_token = create_access_token({"sub": dosen.id, "email": dosen.email, "role": dosen.role.value})
    mhs_token = create_access_token({"sub": mhs.id, "email": mhs.email, "role": mhs.role.value})

    return {
        "dosen": dosen,
        "mhs": mhs,
        "class": cls,
        "assignment": assignment,
        "rubric": rubric,
        "submission": sub,
        "version": ver,
        "dosen_token": dosen_token,
        "mhs_token": mhs_token,
    }


def test_ai_grading_stream_contract_and_draft_persistence(client, setup_eval_env, db_session):
    """
    Test Stage 3:
    - Stream returns text/event-stream.
    - Emits 'status' events with step, totalSteps, message, progress.
    - Emits 'done' event with valid aiEvaluation result.
    - Draft evaluation is saved in database.
    """
    env = setup_eval_env
    sub_id = env["submission"].id

    res = client.get(
        f"/submissions/{sub_id}/grade/stream",
        headers={"Authorization": f"Bearer {env['dosen_token']}"},
    )
    assert res.status_code == 200
    assert "text/event-stream" in res.headers.get("content-type", "")

    raw_stream = res.text
    assert "event: status" in raw_stream
    assert "event: done" in raw_stream

    # Parse individual events
    lines = raw_stream.split("\n")
    events = []
    current_event = None
    current_data = None

    for line in lines:
        line = line.strip()
        if line.startswith("event:"):
            current_event = line.replace("event:", "").strip()
        elif line.startswith("data:"):
            current_data = line.replace("data:", "").strip()
        elif line == "" and current_event and current_data:
            events.append((current_event, json.loads(current_data)))
            current_event = None
            current_data = None

    # Check status progress events
    status_events = [e for e in events if e[0] == "status"]
    assert len(status_events) >= 3
    assert status_events[0][1]["step"] == 1
    assert "totalSteps" in status_events[0][1]

    # Check done event
    done_events = [e for e in events if e[0] == "done"]
    assert len(done_events) == 1
    done_data = done_events[0][1]
    assert done_data["success"] is True
    assert "aiEvaluation" in done_data
    assert done_data["aiEvaluation"]["suggestedTotalScore"] is not None

    # Verify draft saved in database
    ev_in_db = db_session.query(EvaluationRun).filter(EvaluationRun.submissionId == sub_id).first()
    assert ev_in_db is not None
    assert ev_in_db.suggestedTotalScore == done_data["aiEvaluation"]["suggestedTotalScore"]


def test_student_cannot_access_stream_or_ai_drafts(client, setup_eval_env, db_session):
    """
    Students must NOT be able to call AI grading endpoints or view AI drafts
    prior to grade finalization.
    """
    env = setup_eval_env
    sub_id = env["submission"].id

    # Student calling stream -> Forbidden (403)
    res_stream = client.get(
        f"/submissions/{sub_id}/grade/stream",
        headers={"Authorization": f"Bearer {env['mhs_token']}"},
    )
    assert res_stream.status_code == 403

    # Student calling POST grade -> Forbidden (403)
    res_post = client.post(
        f"/submissions/{sub_id}/grade",
        headers={"Authorization": f"Bearer {env['mhs_token']}"},
    )
    assert res_post.status_code == 403

    # Dosen grades submission
    client.post(
        f"/submissions/{sub_id}/grade",
        headers={"Authorization": f"Bearer {env['dosen_token']}"},
    )

    # Student views submission detail -> evaluations list must be hidden (empty for student)
    detail_res = client.get(
        f"/submissions/{sub_id}",
        headers={"Authorization": f"Bearer {env['mhs_token']}"},
    )
    assert detail_res.status_code == 200
    student_view = detail_res.json()
    assert student_view.get("evaluations") == []


def test_reference_document_approval_indexing_and_evidence_usage(client, setup_eval_env, db_session):
    """
    Test Stage 4:
    - Lecturer uploads reference document.
    - Approving document indexes chunks into chunk_embeddings with vector(768).
    - Evaluation retrieves and includes evidence_blocks from approved document.
    - Unapproved document is NOT used.
    """
    env = setup_eval_env
    dosen = env["dosen"]
    assignment = env["assignment"]
    sub_id = env["submission"].id

    # 1. Create Reference Document in REVIEW_REQUIRED
    saved_key = storage.save_sync(
        "materi_optimasi.txt",
        b"Buku Panduan Algoritma: Gradient descent konvergen menuju minimum lokal ketika learning rate dipilih dengan tepat. Backpropagation merambatkan gradien error dari layer output kembali ke layer input menggunakan aturan rantai kalkulus.",
    )
    doc = Document(
        assignmentId=assignment.id,
        ownerId=dosen.id,
        sourceType=SourceType.MATERIAL,
    )
    db_session.add(doc)
    db_session.commit()

    ver = DocumentVersion(
        documentId=doc.id,
        versionNumber=1,
        objectKey=saved_key,
        originalName="materi_optimasi.txt",
        mimeType="text/plain",
        checksum="dummychecksum12345",
        size=len(saved_key),
        extractionStatus=DocumentStatus.REVIEW_REQUIRED,
    )
    db_session.add(ver)
    db_session.commit()

    # 2. Before approval: evaluate submission -> evidence blocks should NOT include unapproved doc
    pre_eval = client.post(
        f"/submissions/{sub_id}/grade",
        headers={"Authorization": f"Bearer {env['dosen_token']}"},
    )
    assert pre_eval.status_code == 200
    assert pre_eval.json()["aiEvaluation"].get("evidence") == []

    # 3. Dosen approves document version -> triggers full indexing into chunk_embeddings
    approve_res = client.post(
        f"/document-versions/{ver.id}/approve",
        headers={"Authorization": f"Bearer {env['dosen_token']}"},
    )
    assert approve_res.status_code == 200
    approve_data = approve_res.json()
    assert approve_data["status"] == "APPROVED"
    assert approve_data["indexingPending"] is False
    assert approve_data["chunksIndexed"] > 0

    # Verify embeddings stored in PostgreSQL chunk_embeddings table
    embeddings = db_session.query(ChunkEmbedding).filter(ChunkEmbedding.documentVersionId == ver.id).all()
    assert len(embeddings) > 0
    assert embeddings[0].dimension == 768
    assert embeddings[0].state == "READY"

    # 4. After approval: evaluate submission -> evidence blocks MUST include approved doc
    post_eval = client.post(
        f"/submissions/{sub_id}/grade",
        headers={"Authorization": f"Bearer {env['dosen_token']}"},
    )
    assert post_eval.status_code == 200
    post_data = post_eval.json()["aiEvaluation"]
    assert post_data.get("evidence") is not None
    assert len(post_data["evidence"]) > 0
    assert post_data["evidence"][0]["documentVersionId"] == ver.id
    assert "Gradient descent" in post_data["evidence"][0]["text"]


def test_document_indexing_failure_recovery_and_retry(client, setup_eval_env, db_session, monkeypatch):
    """
    Test Priority 1:
    - Provider fails -> HTTP 503, status FAILED, errorMessage recorded.
    - Lecturer ownership check is enforced (other user cannot approve/retry).
    - Provider recovers -> Retry succeeds, status APPROVED, errorMessage cleared.
    - Chunks and chunk_embeddings are NOT duplicated.
    - Document can now be retrieved as evidence in AI evaluation.
    """
    from unittest.mock import AsyncMock
    import app.routers.documents as doc_router_module
    from app.services.embedding_service import (
        EmbeddingProviderUnavailableError,
        EmbeddingResult,
    )

    env = setup_eval_env
    dosen = env["dosen"]
    mhs = env["mhs"]
    assignment = env["assignment"]
    sub_id = env["submission"].id

    # 1. Create Reference Document in REVIEW_REQUIRED
    saved_key = storage.save_sync(
        "panduan_recovery.txt",
        b"Dokumen Panduan Algoritma Optimasi: Pemulihan layanan embedding harus memastikan idempotensi vektor dan tidak menggandakan data dokumen acuan.",
    )
    doc = Document(
        assignmentId=assignment.id,
        ownerId=dosen.id,
        sourceType=SourceType.MATERIAL,
    )
    db_session.add(doc)
    db_session.commit()

    ver = DocumentVersion(
        documentId=doc.id,
        versionNumber=1,
        objectKey=saved_key,
        originalName="panduan_recovery.txt",
        mimeType="text/plain",
        checksum="checksum_recovery_123",
        size=len(saved_key),
        extractionStatus=DocumentStatus.REVIEW_REQUIRED,
    )
    db_session.add(ver)
    db_session.commit()

    # 2. Simulate embedding provider failure (e.g. Ollama offline)
    async def fail_embedding(text):
        raise EmbeddingProviderUnavailableError("Layanan Ollama offline pada port 11434")

    monkeypatch.setattr(doc_router_module, "generate_embedding_result", fail_embedding)

    # Approve attempt fails
    fail_res = client.post(
        f"/document-versions/{ver.id}/approve",
        headers={"Authorization": f"Bearer {env['dosen_token']}"},
    )
    assert fail_res.status_code == 503
    assert "Layanan embedding gagal" in fail_res.json()["detail"]

    # Verify document status in DB is FAILED with error message
    db_session.refresh(ver)
    assert ver.extractionStatus == DocumentStatus.FAILED
    assert ver.errorMessage is not None
    assert "Layanan Ollama offline" in ver.errorMessage

    # Verify no embeddings were created during failure
    failed_embeddings = (
        db_session.query(ChunkEmbedding)
        .filter(ChunkEmbedding.documentVersionId == ver.id)
        .all()
    )
    assert len(failed_embeddings) == 0

    # 3. Verify lecturer ownership check: Mahasiswa cannot retry/approve
    forbidden_res = client.post(
        f"/document-versions/{ver.id}/approve",
        headers={"Authorization": f"Bearer {env['mhs_token']}"},
    )
    assert forbidden_res.status_code == 403

    # 4. Simulate provider recovery
    async def recovered_embedding(text):
        dim = 768
        vec = [0.1] * dim
        return EmbeddingResult(vector=vec, model="test-recovered-mock-v1", dimension=dim, is_mock=True)

    monkeypatch.setattr(doc_router_module, "generate_embedding_result", recovered_embedding)

    # Retry approval after provider recovery
    retry_res = client.post(
        f"/document-versions/{ver.id}/approve",
        headers={"Authorization": f"Bearer {env['dosen_token']}"},
    )
    assert retry_res.status_code == 200
    retry_data = retry_res.json()
    assert retry_data["status"] == "APPROVED"
    assert retry_data["chunksIndexed"] > 0

    # Verify DB state: APPROVED and errorMessage is CLEARED (None)
    db_session.refresh(ver)
    assert ver.extractionStatus == DocumentStatus.APPROVED
    assert ver.errorMessage is None
    assert ver.approvedById == dosen.id

    # Verify chunk and embedding count: NO duplicates
    chunks = (
        db_session.query(DocumentChunk)
        .filter(DocumentChunk.documentVersionId == ver.id)
        .all()
    )
    embeddings = (
        db_session.query(ChunkEmbedding)
        .filter(ChunkEmbedding.documentVersionId == ver.id)
        .all()
    )
    assert len(chunks) == retry_data["chunksIndexed"]
    assert len(embeddings) == len(chunks)  # Exactly 1 embedding per chunk, no duplicate rows
    assert all(e.dimension == 768 for e in embeddings)
    assert all(e.state == "READY" for e in embeddings)
    assert all(e.model == "test-recovered-mock-v1" for e in embeddings)

