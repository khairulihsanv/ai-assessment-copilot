import io
import json
import uuid
from datetime import datetime, timedelta
import pytest
from fastapi.testclient import TestClient
from PIL import Image, ImageDraw, ImageFont

from app.main import app
from app.models.enums import AssignmentStatus, ClassRole, Role, SubmissionType
from app.models.models import Assignment, Class, Enrollment, Submission, SubmissionPage, SubmissionVersion, User
from app.security.passwords import hash_password
from app.security.tokens import create_access_token
from app.services.ocr_service import ocr_service


def create_test_image_bytes(text: str = "TUGAS ALGORITMA DAN PEMROGRAMAN", width: int = 800, height: int = 400) -> bytes:
    """Create a high-contrast synthetic image containing printed text for real OCR."""
    img = Image.new("RGB", (width, height), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    # Draw simple bounding rectangles and dark text
    draw.rectangle([20, 20, width - 20, height - 20], outline=(0, 0, 0), width=3)
    draw.text((40, 50), text, fill=(0, 0, 0))
    draw.text((40, 120), "Nama: Mahasiswa Uji Scan", fill=(0, 0, 0))
    draw.text((40, 180), "Jawaban Soal Nomor 1: Analisis Kerumitan O(N log N)", fill=(0, 0, 0))
    draw.text((40, 240), "Kesimpulan Algoritma QuickSort Berjalan Optimal", fill=(0, 0, 0))

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=95)
    return buf.getvalue()


def create_corrupted_image_bytes() -> bytes:
    return b"\xff\xd8\xff\xe0CORRUPTED_GARBAGE_PAYLOAD_NOT_A_REAL_IMAGE"


@pytest.fixture
def scan_test_env(db_session):
    uid = uuid.uuid4().hex[:8]

    # Dosen 1 (Owner)
    dosen = User(
        email=f"dosen_scan_{uid}@dexa.ac.id",
        name=f"Dosen Scan {uid}",
        role=Role.DOSEN,
        passwordHash=hash_password("Pass123!Safe"),
    )
    # Dosen 2 (Other class lecturer)
    other_dosen = User(
        email=f"other_dosen_scan_{uid}@dexa.ac.id",
        name=f"Other Dosen {uid}",
        role=Role.DOSEN,
        passwordHash=hash_password("Pass123!Safe"),
    )
    # Mahasiswa A (Enrolled)
    mhs_a = User(
        email=f"mhs_a_scan_{uid}@dexa.ac.id",
        name=f"Mahasiswa A {uid}",
        role=Role.MAHASISWA,
        passwordHash=hash_password("Pass123!Safe"),
    )
    # Mahasiswa B (Enrolled in other class / outsider)
    mhs_b = User(
        email=f"mhs_b_scan_{uid}@dexa.ac.id",
        name=f"Mahasiswa B {uid}",
        role=Role.MAHASISWA,
        passwordHash=hash_password("Pass123!Safe"),
    )
    db_session.add_all([dosen, other_dosen, mhs_a, mhs_b])
    db_session.flush()

    # Class 1
    cls = Class(
        name=f"Kelas Scan {uid}",
        description="Kelas pengujian fitur scan jawaban",
        subject="Teknologi Informasi",
        enrollmentKey=f"SCAN-{uid[:6].upper()}",
        dosenId=dosen.id,
    )
    db_session.add(cls)
    db_session.flush()

    # Enrollment (Mahasiswa A is enrolled)
    enrollment = Enrollment(
        classId=cls.id,
        mahasiswaId=mhs_a.id,
        role=ClassRole.STUDENT,
    )
    db_session.add(enrollment)
    db_session.commit()

    # Assignment with allowScan=True, submissionType=ANY
    asg_scan_allowed = Assignment(
        classId=cls.id,
        title="Tugas Praktikum Struktur Data",
        instructions="Kerjakan di lembar kertas dan foto atau unggah berkas",
        maxScore=100.0,
        status=AssignmentStatus.PUBLISHED,
        submissionType=SubmissionType.ANY,
        allowScan=True,
        dueDate=datetime.utcnow() + timedelta(days=7),
    )
    # Assignment with allowScan=False (Scan forbidden)
    asg_scan_forbidden = Assignment(
        classId=cls.id,
        title="Tugas Makalah Word Only",
        instructions="Wajib DOCX, dilarang scan kertas",
        maxScore=100.0,
        status=AssignmentStatus.PUBLISHED,
        submissionType=SubmissionType.DOCX,
        allowScan=False,
        dueDate=datetime.utcnow() + timedelta(days=7),
    )
    db_session.add_all([asg_scan_allowed, asg_scan_forbidden])
    db_session.commit()

    return {
        "class": cls,
        "asg_scan": asg_scan_allowed,
        "asg_no_scan": asg_scan_forbidden,
        "dosen": dosen,
        "other_dosen": other_dosen,
        "mhs_a": mhs_a,
        "mhs_b": mhs_b,
        "dosen_token": create_access_token({"sub": dosen.id, "email": dosen.email, "role": dosen.role.value}),
        "other_dosen_token": create_access_token({"sub": other_dosen.id, "email": other_dosen.email, "role": other_dosen.role.value}),
        "mhs_a_token": create_access_token({"sub": mhs_a.id, "email": mhs_a.email, "role": mhs_a.role.value}),
        "mhs_b_token": create_access_token({"sub": mhs_b.id, "email": mhs_b.email, "role": mhs_b.role.value}),
    }


def test_real_ocr_engine_extract_image():
    """Test real RapidOCR extraction on high-contrast synthetic printed text."""
    img_bytes = create_test_image_bytes("ALGORITMA PEMROGRAMAN STRUKTUR DATA")
    result = ocr_service.ocr_image_bytes(img_bytes)

    assert result["status"] in ["SUCCESS", "PARTIAL"]
    assert result["width"] == 800
    assert result["height"] == 400
    assert len(result["text"].strip()) > 0
    # Check that key words were recognized by the real local OCR engine
    lower_text = result["text"].lower()
    assert "algoritma" in lower_text or "struktur" in lower_text or "quicksort" in lower_text


def test_ocr_scan_preview_endpoint(client, scan_test_env):
    """Test POST /classes/{class_id}/assignments/{assignment_id}/submissions/ocr-scan preview endpoint."""
    env = scan_test_env
    img1 = create_test_image_bytes("Halaman Satu Jawaban Scan")
    img2 = create_test_image_bytes("Halaman Dua Jawaban Scan")

    files = [
        ("files", ("hal1.jpg", img1, "image/jpeg")),
        ("files", ("hal2.jpg", img2, "image/jpeg")),
    ]

    res = client.post(
        f"/classes/{env['class'].id}/assignments/{env['asg_scan'].id}/submissions/ocr-scan",
        headers={"Authorization": f"Bearer {env['mhs_a_token']}"},
        files=files,
    )

    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["pageCount"] == 2
    assert len(data["pages"]) == 2

    # Check page numbers and structure
    p1 = data["pages"][0]
    assert p1["pageNumber"] == 1
    assert p1["fileName"] == "hal1.jpg"
    assert p1["status"] in ["SUCCESS", "PARTIAL"]
    assert len(p1["extractedText"]) > 0

    p2 = data["pages"][1]
    assert p2["pageNumber"] == 2
    assert p2["fileName"] == "hal2.jpg"
    assert p2["status"] in ["SUCCESS", "PARTIAL"]


def test_ocr_scan_forbidden_when_assignment_disallows_scan(client, scan_test_env):
    """Scan is rejected when assignment has allowScan=False."""
    env = scan_test_env
    img = create_test_image_bytes("Jawaban scan ilegal")

    res = client.post(
        f"/classes/{env['class'].id}/assignments/{env['asg_no_scan'].id}/submissions/ocr-scan",
        headers={"Authorization": f"Bearer {env['mhs_a_token']}"},
        files=[("files", ("scan.jpg", img, "image/jpeg"))],
    )
    assert res.status_code == 400
    assert "tidak mengizinkan pengumpulan berbasis scan" in res.text.lower()


def test_submit_scan_with_student_correction_preserves_both_texts(client, scan_test_env, db_session):
    """Student submits scan pages with manual edits. Verifies raw OCR and confirmed text are stored separately."""
    env = scan_test_env
    img1 = create_test_image_bytes("Teks Asli Lembar 1")
    img2 = create_test_image_bytes("Teks Asli Lembar 2")

    pages_meta = [
        {
            "pageNumber": 1,
            "imageName": "halaman_1.jpg",
            "extractedText": "Teks mentah hasil pembacaan OCR mesin lembar 1",
            "confirmedText": "Teks hasil koreksi manual mahasiswa pada lembar 1 yang lebih akurat",
            "status": "SUCCESS",
            "source": "CAMERA",
        },
        {
            "pageNumber": 2,
            "imageName": "halaman_2.jpg",
            "extractedText": "Teks mentah OCR lembar 2",
            "confirmedText": "Teks terkonfirmasi lembar 2",
            "status": "SUCCESS",
            "source": "GALLERY",
        },
    ]

    combined_confirmed_content = (
        "--- Halaman 1 ---\nTeks hasil koreksi manual mahasiswa pada lembar 1 yang lebih akurat\n\n"
        "--- Halaman 2 ---\nTeks terkonfirmasi lembar 2"
    )

    data = {
        "isScanSubmission": "true",
        "content": combined_confirmed_content,
        "pages_meta": json.dumps(pages_meta),
    }

    files = [
        ("files", ("halaman_1.jpg", img1, "image/jpeg")),
        ("files", ("halaman_2.jpg", img2, "image/jpeg")),
    ]

    res = client.post(
        f"/classes/{env['class'].id}/assignments/{env['asg_scan'].id}/submissions",
        headers={"Authorization": f"Bearer {env['mhs_a_token']}"},
        data=data,
        files=files,
    )

    assert res.status_code == 201
    res_data = res.json()
    sub_id = res_data["submissionId"]
    assert res_data["type"] == "SCAN"

    # Query database directly to verify models
    version = (
        db_session.query(SubmissionVersion)
        .join(Submission, Submission.id == SubmissionVersion.submissionId)
        .filter(Submission.id == sub_id)
        .first()
    )
    assert version is not None
    assert version.type == SubmissionType.SCAN
    assert version.isEdited is True  # Student modified text
    assert "Teks hasil koreksi manual" in version.content
    assert "Teks mentah hasil pembacaan OCR" in (version.rawOcrText or "")
    assert version.pageCount == 2

    # Check pages table
    pages = (
        db_session.query(SubmissionPage)
        .filter(SubmissionPage.submissionVersionId == version.id)
        .order_by(SubmissionPage.pageNumber.asc())
        .all()
    )
    assert len(pages) == 2
    assert pages[0].pageNumber == 1
    assert pages[0].source == "CAMERA"
    assert pages[0].confirmedText == "Teks hasil koreksi manual mahasiswa pada lembar 1 yang lebih akurat"
    assert pages[0].extractedText == "Teks mentah hasil pembacaan OCR mesin lembar 1"

    assert pages[1].pageNumber == 2
    assert pages[1].source == "GALLERY"

    # Reload submission detail via GET /submissions/{id}
    detail_res = client.get(
        f"/submissions/{sub_id}",
        headers={"Authorization": f"Bearer {env['mhs_a_token']}"},
    )
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["activeVersion"]["isEdited"] is True
    assert len(detail["activeVersion"]["pages"]) == 2
    assert detail["activeVersion"]["pages"][0]["pageNumber"] == 1
    assert detail["activeVersion"]["pages"][1]["pageNumber"] == 2


def test_access_control_for_page_image_streaming(client, scan_test_env):
    """Enrolled student and assignment dosen can view page images; outsiders are rejected (403)."""
    env = scan_test_env
    img = create_test_image_bytes("Halaman Hak Akses")

    pages_meta = [
        {
            "pageNumber": 1,
            "imageName": "privat_hal1.jpg",
            "extractedText": "Privat OCR",
            "confirmedText": "Privat OCR Confirmed",
            "status": "SUCCESS",
            "source": "CAMERA",
        }
    ]

    res = client.post(
        f"/classes/{env['class'].id}/assignments/{env['asg_scan'].id}/submissions",
        headers={"Authorization": f"Bearer {env['mhs_a_token']}"},
        data={
            "isScanSubmission": "true",
            "content": "Privat OCR Confirmed",
            "pages_meta": json.dumps(pages_meta),
        },
        files=[("files", ("privat_hal1.jpg", img, "image/jpeg"))],
    )
    assert res.status_code == 201
    sub_id = res.json()["submissionId"]

    # 1. Mahasiswa A (Owner) -> 200 OK
    res_owner = client.get(
        f"/submissions/{sub_id}/pages/1/image",
        headers={"Authorization": f"Bearer {env['mhs_a_token']}"},
    )
    assert res_owner.status_code == 200
    assert res_owner.headers["content-type"].startswith("image/")

    # 2. Dosen (Class Lecturer) -> 200 OK
    res_dosen = client.get(
        f"/submissions/{sub_id}/pages/1/image",
        headers={"Authorization": f"Bearer {env['dosen_token']}"},
    )
    assert res_dosen.status_code == 200

    # 3. Mahasiswa B (Outsider) -> 403 Forbidden
    res_mhs_b = client.get(
        f"/submissions/{sub_id}/pages/1/image",
        headers={"Authorization": f"Bearer {env['mhs_b_token']}"},
    )
    assert res_mhs_b.status_code == 403

    # 4. Other Dosen (Not lecturer of this class) -> 403 Forbidden
    res_other_dosen = client.get(
        f"/submissions/{sub_id}/pages/1/image",
        headers={"Authorization": f"Bearer {env['other_dosen_token']}"},
    )
    assert res_other_dosen.status_code == 403

    # 5. Invalid page number -> 404
    res_not_found = client.get(
        f"/submissions/{sub_id}/pages/99/image",
        headers={"Authorization": f"Bearer {env['dosen_token']}"},
    )
    assert res_not_found.status_code == 404


def test_invalid_image_upload_rejected(client, scan_test_env):
    """Uploading non-image files to scan endpoint is rejected with 400 Bad Request."""
    env = scan_test_env
    fake_img = b"PLAIN_TEXT_NOT_AN_IMAGE_FILE_PAYLOAD"

    res = client.post(
        f"/classes/{env['class'].id}/assignments/{env['asg_scan'].id}/submissions/ocr-scan",
        headers={"Authorization": f"Bearer {env['mhs_a_token']}"},
        files=[("files", ("dokumen.jpg", fake_img, "image/jpeg"))],
    )
    assert res.status_code == 400
    assert "bukan gambar atau pdf yang valid" in res.text.lower()


def test_oversized_file_rejected(client, scan_test_env):
    """File exceeding 10MB limit is rejected."""
    env = scan_test_env
    # 11MB dummy buffer with JPEG header
    big_buffer = b"\xff\xd8\xff\xe0" + b"\x00" * (11 * 1024 * 1024)

    res = client.post(
        f"/classes/{env['class'].id}/assignments/{env['asg_scan'].id}/submissions/ocr-scan",
        headers={"Authorization": f"Bearer {env['mhs_a_token']}"},
        files=[("files", ("big.jpg", big_buffer, "image/jpeg"))],
    )
    assert res.status_code == 400
    assert "melebihi batas 10mb" in res.text.lower()


def test_max_page_limit_enforced(client, scan_test_env, monkeypatch):
    """Attempting to scan more pages than SCAN_MAX_PAGES is rejected with 400."""
    from app.config import settings

    monkeypatch.setattr(settings, "SCAN_MAX_PAGES", 15)
    env = scan_test_env
    img = create_test_image_bytes("Hal")

    # 16 pages
    files = [("files", (f"p{i}.jpg", img, "image/jpeg")) for i in range(16)]

    res = client.post(
        f"/classes/{env['class'].id}/assignments/{env['asg_scan'].id}/submissions/ocr-scan",
        headers={"Authorization": f"Bearer {env['mhs_a_token']}"},
        files=files,
    )
    assert res.status_code == 400
    assert "maksimal 15 halaman" in res.text.lower()


# ---------------------------------------------------------------------------
# Scan pipeline: RapidOCR first, vision model for pages it reads poorly
# ---------------------------------------------------------------------------


def _rapid(confidence: float, text: str = "teks rapidocr", status: str = "SUCCESS") -> dict:
    return {"status": status, "text": text, "lines": [], "confidence": confidence,
            "width": 800, "height": 400, "error": None}


@pytest.mark.asyncio
async def test_auto_ocr_sends_poorly_read_page_to_vision_model(monkeypatch):
    from app.config import settings
    from app.services import scan_pipeline, vision_ocr

    monkeypatch.setattr(settings, "OCR_ENGINE", "auto")
    monkeypatch.setattr(settings, "OCR_VISION_PROVIDER", "groq")
    monkeypatch.setattr(settings, "GROQ_API_KEY", "gsk-test")
    monkeypatch.setattr(ocr_service, "ocr_image_bytes", lambda b, f="p.jpg": _rapid(0.42, "t3ks rus4k"))

    async def fake_transcribe(image_bytes):
        return vision_ocr.VisionTranscript("Normalisasi mengurangi redundansi.", "groq", "scout", 900, 40)

    monkeypatch.setattr(vision_ocr, "transcribe", fake_transcribe)

    result = await scan_pipeline.read_image(b"img")

    assert result["text"] == "Normalisasi mengurangi redundansi."
    assert result["engine"].startswith("vision:")
    assert result["tokens"] == 940


@pytest.mark.asyncio
async def test_auto_ocr_keeps_good_rapidocr_read_without_spending_tokens(monkeypatch):
    from app.config import settings
    from app.services import scan_pipeline, vision_ocr

    monkeypatch.setattr(settings, "OCR_ENGINE", "auto")
    monkeypatch.setattr(settings, "OCR_VISION_PROVIDER", "groq")
    monkeypatch.setattr(settings, "GROQ_API_KEY", "gsk-test")
    monkeypatch.setattr(ocr_service, "ocr_image_bytes", lambda b, f="p.jpg": _rapid(0.97))
    called = []

    async def fake_transcribe(image_bytes):
        called.append(1)
        raise AssertionError("vision model should not be called")

    monkeypatch.setattr(vision_ocr, "transcribe", fake_transcribe)

    result = await scan_pipeline.read_image(b"img")

    assert result["engine"] == "rapidocr"
    assert result["tokens"] == 0
    assert called == []


@pytest.mark.asyncio
async def test_vision_failure_falls_back_to_rapidocr_text(monkeypatch):
    from app.config import settings
    from app.services import scan_pipeline, vision_ocr

    monkeypatch.setattr(settings, "OCR_ENGINE", "auto")
    monkeypatch.setattr(settings, "OCR_VISION_PROVIDER", "ollama")
    monkeypatch.setattr(ocr_service, "ocr_image_bytes", lambda b, f="p.jpg": _rapid(0.5, "teks samar"))

    async def failing(image_bytes):
        raise vision_ocr.VisionOCRError("Ollama mati")

    monkeypatch.setattr(vision_ocr, "transcribe", failing)

    result = await scan_pipeline.read_image(b"img")

    assert result["text"] == "teks samar"
    assert result["engine"] == "rapidocr"


@pytest.mark.asyncio
async def test_rejected_file_is_never_sent_to_vision_model(monkeypatch):
    from app.config import settings
    from app.services import scan_pipeline, vision_ocr

    monkeypatch.setattr(settings, "OCR_ENGINE", "auto")
    monkeypatch.setattr(settings, "OCR_VISION_PROVIDER", "ollama")

    async def boom(image_bytes):
        raise AssertionError("vision model should not see a rejected file")

    monkeypatch.setattr(vision_ocr, "transcribe", boom)

    result = await scan_pipeline.read_image(create_corrupted_image_bytes())

    assert result["status"] == "FAILED"


def test_vision_image_is_downscaled_before_sending():
    from app.services.vision_ocr import prepare_image

    big = io.BytesIO()
    Image.new("RGB", (4000, 3000), "white").save(big, format="JPEG")
    small = Image.open(io.BytesIO(prepare_image(big.getvalue(), max_side=1600)))
    assert max(small.size) == 1600


# ---------------------------------------------------------------------------
# Page references: OCR preview stores the image, final submit sends only the reference
# ---------------------------------------------------------------------------


def test_page_ref_is_bound_to_student_and_assignment():
    from app.routers.submissions import _page_ref, _resolve_page_ref

    ref = _page_ref("mhs-1", "asg-1", "abc123.jpg")
    assert _resolve_page_ref("mhs-1", "asg-1", ref) == "abc123.jpg"
    assert _resolve_page_ref("mhs-2", "asg-1", ref) is None
    assert _resolve_page_ref("mhs-1", "asg-2", ref) is None
    assert _resolve_page_ref("mhs-1", "asg-1", "../etc/passwd:" + ref.split(":")[1]) is None
    assert _resolve_page_ref("mhs-1", "asg-1", "abc123.jpg:forged") is None


def test_scan_submit_with_page_refs_reuses_preview_images(client, scan_test_env, db_session):
    env = scan_test_env
    base = f"/classes/{env['class'].id}/assignments/{env['asg_scan'].id}/submissions"
    auth = {"Authorization": f"Bearer {env['mhs_a_token']}"}

    refs = []
    for n in (1, 2):
        preview = client.post(
            f"{base}/ocr-scan",
            headers=auth,
            data={"pageNumber": str(n)},
            files=[("files", (f"hal{n}.jpg", create_test_image_bytes(f"Lembar {n}"), "image/jpeg"))],
        )
        assert preview.status_code == 200, preview.text
        page = preview.json()["pages"][0]
        assert page["pageNumber"] == n
        assert page["pageRef"]
        refs.append(page["pageRef"])

    pages_meta = [
        {"pageNumber": n, "extractedText": f"ocr {n}", "confirmedText": f"jawaban halaman {n}", "status": "SUCCESS"}
        for n in (1, 2)
    ]
    res = client.post(
        base,
        headers=auth,
        data={
            "isScanSubmission": "true",
            "pages_meta": json.dumps(pages_meta),
            "page_ref_1": refs[0],
            "page_ref_2": refs[1],
        },
    )
    assert res.status_code == 201, res.text

    version = db_session.query(SubmissionVersion).filter(SubmissionVersion.id == res.json()["versionId"]).first()
    pages = sorted(version.pages, key=lambda p: p.pageNumber)
    assert [p.imageUrl for p in pages] == [r.split(":")[0] for r in refs]
    assert "jawaban halaman 2" in version.content


def test_scan_submit_rejects_page_ref_of_another_student(client, scan_test_env):
    from app.routers.submissions import _page_ref

    env = scan_test_env
    forged = _page_ref(env["mhs_b"].id, env["asg_scan"].id, "someone-else.jpg")
    res = client.post(
        f"/classes/{env['class'].id}/assignments/{env['asg_scan'].id}/submissions",
        headers={"Authorization": f"Bearer {env['mhs_a_token']}"},
        data={
            "isScanSubmission": "true",
            "pages_meta": json.dumps([{"pageNumber": 1, "confirmedText": "x", "extractedText": "x"}]),
            "page_ref_1": forged,
        },
    )
    assert res.status_code == 400
    assert "tidak valid" in res.text.lower()
