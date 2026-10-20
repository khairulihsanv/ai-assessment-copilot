"""
E2E Fixture Seeder for FastAPI Backend & Dexa Assessment Monorepo.
Seeds deterministic test fixtures safely without dropping existing user data.
"""

from datetime import datetime, timedelta
import bcrypt
from app.database import Base, SessionLocal, engine
from app.models.enums import AssignmentStatus, ClassRole, Role, SubmissionType
from app.models.models import Assignment, Class, Enrollment, Rubric, RubricCriterion, User

FIXTURE_PASSWORD = "Password123!"


def seed_fixtures():
    # Schema must already be provisioned by Alembic migrations
    db = SessionLocal()
    try:
        # Hash password using bcrypt
        salt = bcrypt.gensalt(rounds=10)
        password_hash = bcrypt.hashpw(FIXTURE_PASSWORD.encode("utf-8"), salt).decode("utf-8")

        test_emails = [
            "dosen_a@test.local",
            "dosen_b@test.local",
            "mhs_a@test.local",
            "mhs_b@test.local",
            "asisten_a@test.local",
        ]

        # Check or create users
        users_map = {}
        for email, name, role in [
            ("dosen_a@test.local", "Dr. Dosen A, M.Kom.", Role.DOSEN),
            ("dosen_b@test.local", "Prof. Dosen B, Ph.D.", Role.DOSEN),
            ("mhs_a@test.local", "Mahasiswa A Pratama", Role.MAHASISWA),
            ("mhs_b@test.local", "Mahasiswa B Santoso", Role.MAHASISWA),
            ("asisten_a@test.local", "Asisten A Wijaya", Role.MAHASISWA),
        ]:
            user = db.query(User).filter(User.email == email).first()
            if not user:
                user = User(
                    name=name,
                    email=email,
                    passwordHash=password_hash,
                    role=role,
                )
                db.add(user)
                db.flush()
            else:
                user.passwordHash = password_hash
                user.name = name
                user.role = role
                db.flush()
            users_map[email] = user

        # Check or create Class A
        class_a = db.query(Class).filter(Class.enrollmentKey == "KEY-RPLA").first()
        if not class_a:
            class_a = Class(
                name="Rekayasa Perangkat Lunak A",
                subject="RPL-2026",
                description="Kelas RPL Tahun Ajaran 2026/2027",
                enrollmentKey="KEY-RPLA",
                dosenId=users_map["dosen_a@test.local"].id,
            )
            db.add(class_a)
            db.flush()
        else:
            class_a.dosenId = users_map["dosen_a@test.local"].id
            db.flush()

        # Check or create Class B
        class_b = db.query(Class).filter(Class.enrollmentKey == "KEY-BDB").first()
        if not class_b:
            class_b = Class(
                name="Basis Data B",
                subject="BD-2026",
                description="Kelas Basis Data Lanjut",
                enrollmentKey="KEY-BDB",
                dosenId=users_map["dosen_b@test.local"].id,
            )
            db.add(class_b)
            db.flush()
        else:
            class_b.dosenId = users_map["dosen_b@test.local"].id
            db.flush()

        # Enrollments
        def ensure_enrollment(class_id: str, user_id: str, role: ClassRole):
            enr = db.query(Enrollment).filter(
                Enrollment.classId == class_id,
                Enrollment.mahasiswaId == user_id,
            ).first()
            if not enr:
                enr = Enrollment(classId=class_id, mahasiswaId=user_id, role=role)
                db.add(enr)
                db.flush()

        ensure_enrollment(class_a.id, users_map["mhs_a@test.local"].id, ClassRole.STUDENT)
        ensure_enrollment(class_a.id, users_map["asisten_a@test.local"].id, ClassRole.ASSISTANT)
        ensure_enrollment(class_b.id, users_map["mhs_b@test.local"].id, ClassRole.STUDENT)

        # Rubric for Class A
        rubric_a = db.query(Rubric).filter(Rubric.classId == class_a.id).first()
        if not rubric_a:
            rubric_a = Rubric(
                title="Rubrik Penilaian Analisis Perangkat Lunak",
                classId=class_a.id,
                createdById=users_map["dosen_a@test.local"].id,
            )
            db.add(rubric_a)
            db.flush()

            crit1 = RubricCriterion(
                rubricId=rubric_a.id,
                label="Ketepatan Analisis",
                description="Analisis use-case dan kebutuhan sistem lengkap",
                maxScore=60,
                weight=60.0,
                answerKey="Sistem harus memuat identifikasi aktor, functional requirement, dan use case diagram.",
            )
            crit2 = RubricCriterion(
                rubricId=rubric_a.id,
                label="Kualitas Penjelasan",
                description="Bahasa terstruktur dan disertai contoh kasus nyata",
                maxScore=40,
                weight=40.0,
                material="Gunakan pedoman penulisan dokumen SRS IEEE 830.",
            )
            db.add_all([crit1, crit2])
            db.flush()

        # Assignment A1
        assignment_a1 = db.query(Assignment).filter(Assignment.classId == class_a.id).first()
        if not assignment_a1:
            due_date = datetime.now() + timedelta(days=7)
            assignment_a1 = Assignment(
                title="Tugas 1: Spesifikasi Kebutuhan Perangkat Lunak",
                instructions="Uraikan kebutuhan fungsional dan non-fungsional aplikasi web e-learning.",
                submissionType=SubmissionType.ANY,
                dueDate=due_date,
                maxScore=100.0,
                status=AssignmentStatus.PUBLISHED,
                classId=class_a.id,
                rubricId=rubric_a.id,
            )
            db.add(assignment_a1)
            db.flush()

        db.commit()
        print("E2E fixtures seeded successfully without altering existing users!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding fixtures: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_fixtures()
