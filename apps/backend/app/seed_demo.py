"""Idempotent demo data: one lecturer, one student, a class, a rubric, an essay task and a submission.

Run with ``python -m app.seed_demo`` after ``alembic upgrade head``. Safe to run repeatedly:
existing rows are reused, nothing is deleted.

Accounts
    dosen.demo@example.com     / Dosen@12345
    mahasiswa.demo@example.com / Mhs@12345
Class enrollment key: DEMO01
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta

from app.database import SessionLocal
from app.models.enums import AssignmentStatus, ClassRole, Role, SubmissionType
from app.models.models import (
    Assignment,
    Class,
    Enrollment,
    Rubric,
    RubricCriterion,
    Submission,
    SubmissionVersion,
    User,
)
from app.security.passwords import hash_password

logger = logging.getLogger("seed_demo")

DOSEN_EMAIL = "dosen.demo@example.com"
DOSEN_PASSWORD = "Dosen@12345"
MHS_EMAIL = "mahasiswa.demo@example.com"
MHS_PASSWORD = "Mhs@12345"
CLASS_KEY = "DEMO01"
RUBRIC_TITLE = "Rubrik Esai Normalisasi Basis Data"
ASSIGNMENT_TITLE = "Esai: Normalisasi Basis Data"

CRITERIA = [
    {
        "label": "Pemahaman konsep",
        "description": "Menjelaskan tujuan normalisasi dan anomali data (insert, update, delete) dengan tepat.",
        "weight": 30.0,
        "maxScore": 10.0,
        "expectedAnswer": (
            "Normalisasi bertujuan mengurangi redundansi dan mencegah anomali insert, update, dan delete "
            "dengan memecah tabel berdasarkan ketergantungan fungsional."
        ),
    },
    {
        "label": "Penerapan bentuk normal",
        "description": "Menerapkan 1NF, 2NF, dan 3NF pada contoh tabel dan menjelaskan ketergantungan fungsional.",
        "weight": 40.0,
        "maxScore": 10.0,
        "expectedAnswer": (
            "1NF menghilangkan grup berulang/atribut multivalued, 2NF menghilangkan ketergantungan parsial "
            "pada kunci komposit, 3NF menghilangkan ketergantungan transitif."
        ),
    },
    {
        "label": "Struktur dan argumentasi",
        "description": "Esai runtut, memberi contoh konkret, dan menyimpulkan kapan denormalisasi masuk akal.",
        "weight": 30.0,
        "maxScore": 10.0,
        "expectedAnswer": (
            "Tulisan memiliki pendahuluan, pembahasan dengan contoh tabel, dan kesimpulan; menyebut trade-off "
            "denormalisasi untuk performa baca."
        ),
    },
]

SAMPLE_ANSWER = """Normalisasi basis data adalah proses menata tabel agar data tidak disimpan berulang-ulang. Tujuannya mengurangi redundansi sehingga tidak terjadi anomali saat data ditambah, diubah, atau dihapus. Contohnya, jika alamat dosen disimpan di setiap baris mata kuliah, mengubah alamat berarti harus mengubah banyak baris.

Pada bentuk normal pertama (1NF), setiap kolom harus berisi nilai atomik, jadi kolom "hobi" yang berisi beberapa nilai harus dipisah. Bentuk normal kedua (2NF) menghapus ketergantungan parsial, misalnya pada tabel KRS dengan kunci (NIM, kode_mk), nama mata kuliah hanya bergantung pada kode_mk sehingga dipindah ke tabel MataKuliah. Bentuk normal ketiga (3NF) menghapus ketergantungan transitif, seperti nama prodi yang bergantung pada kode prodi, bukan langsung pada NIM.

Menurut saya normalisasi tidak selalu harus sampai 3NF. Untuk laporan yang sering dibaca, denormalisasi kadang dipakai supaya query lebih cepat, walaupun risikonya data bisa tidak konsisten. Kesimpulannya, normalisasi membuat basis data lebih rapi dan konsisten, tetapi perancang tetap perlu mempertimbangkan kebutuhan performa."""


def _get_or_create_user(db, email: str, name: str, password: str, role: Role) -> User:
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        user = User(name=name, email=email, passwordHash=hash_password(password), role=role)
        db.add(user)
        db.flush()
    return user


def seed_demo() -> None:
    db = SessionLocal()
    try:
        dosen = _get_or_create_user(db, DOSEN_EMAIL, "Dr. Rina Demo, M.Kom.", DOSEN_PASSWORD, Role.DOSEN)
        mhs = _get_or_create_user(db, MHS_EMAIL, "Bagas Demo Pratama", MHS_PASSWORD, Role.MAHASISWA)

        cls = db.query(Class).filter(Class.enrollmentKey == CLASS_KEY).first()
        if cls is None:
            cls = Class(
                name="Basis Data — Kelas Demo",
                description="Kelas contoh untuk mencoba alur penilaian dengan draf AI.",
                subject="Basis Data",
                enrollmentKey=CLASS_KEY,
                dosenId=dosen.id,
            )
            db.add(cls)
            db.flush()

        if not db.query(Enrollment).filter(Enrollment.classId == cls.id, Enrollment.mahasiswaId == mhs.id).first():
            db.add(Enrollment(classId=cls.id, mahasiswaId=mhs.id, role=ClassRole.STUDENT))
            db.flush()

        rubric = db.query(Rubric).filter(Rubric.classId == cls.id, Rubric.title == RUBRIC_TITLE).first()
        if rubric is None:
            rubric = Rubric(title=RUBRIC_TITLE, classId=cls.id, createdById=dosen.id)
            db.add(rubric)
            db.flush()
            for position, c in enumerate(CRITERIA):
                db.add(RubricCriterion(rubricId=rubric.id, position=position, answerKey=c["expectedAnswer"], **c))
            db.flush()

        assignment = (
            db.query(Assignment).filter(Assignment.classId == cls.id, Assignment.title == ASSIGNMENT_TITLE).first()
        )
        if assignment is None:
            assignment = Assignment(
                classId=cls.id,
                title=ASSIGNMENT_TITLE,
                instructions=(
                    "Tulis esai 300–500 kata tentang normalisasi basis data. Jelaskan tujuan normalisasi, "
                    "terapkan 1NF–3NF pada contoh tabel akademik, dan bahas kapan denormalisasi masuk akal."
                ),
                submissionType=SubmissionType.ANY,
                dueDate=datetime.now() + timedelta(days=30),
                maxScore=100.0,
                allowLateSubmission=True,
                status=AssignmentStatus.PUBLISHED,
                rubricId=rubric.id,
            )
            db.add(assignment)
            db.flush()

        submission = (
            db.query(Submission)
            .filter(Submission.assignmentId == assignment.id, Submission.mahasiswaId == mhs.id)
            .first()
        )
        if submission is None:
            submission = Submission(assignmentId=assignment.id, mahasiswaId=mhs.id)
            db.add(submission)
            db.flush()
            version = SubmissionVersion(
                submissionId=submission.id,
                versionNumber=1,
                type=SubmissionType.TEXT,
                content=SAMPLE_ANSWER,
            )
            db.add(version)
            db.flush()
            submission.activeVersionId = version.id

        db.commit()
        logger.info("Demo data ready: %s / %s, class key %s", DOSEN_EMAIL, MHS_EMAIL, CLASS_KEY)
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    seed_demo()
