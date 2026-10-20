import os
import sys
import urllib.parse
from pathlib import Path
import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from alembic.config import Config
from alembic import command

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# Isolated PostgreSQL Test Database URL
DEFAULT_TEST_DB_URL = "postgresql://postgres:password@127.0.0.1:5432/ai_assessment_test"
TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL", DEFAULT_TEST_DB_URL)

# ---------------------------------------------------------------------------
# Strict Safety Guard: Prevent accidental connection/drop to production or dev DB
# ---------------------------------------------------------------------------
def assert_safe_test_db(url: str, engine_instance=None) -> None:
    parsed = urllib.parse.urlparse(url)
    db_name = parsed.path.lstrip("/").lower()

    if not db_name or "test" not in db_name:
        raise RuntimeError(
            f"SAFETY ABORT: TEST_DATABASE_URL database '{db_name}' is not an isolated test database. "
            f"Database name must contain 'test'."
        )

    forbidden_keywords = ["copilot", "prod", "production", "live"]
    if any(keyword in db_name for keyword in forbidden_keywords):
        raise RuntimeError(
            f"SAFETY ABORT: TEST_DATABASE_URL database '{db_name}' contains forbidden keyword. "
            f"Cannot run tests against development or production database."
        )

    if engine_instance is not None:
        with engine_instance.connect() as conn:
            current_db = conn.execute(text("SELECT current_database()")).scalar()
            if not current_db or "test" not in str(current_db).lower():
                raise RuntimeError(
                    f"SAFETY ABORT: Connected database '{current_db}' is not a verified test database! Aborting."
                )
            if str(current_db).lower() == "ai_assessment_copilot":
                raise RuntimeError(
                    f"SAFETY ABORT: Connected database is 'ai_assessment_copilot' (application database)! Aborting."
                )

# Perform initial URL check before any imports
assert_safe_test_db(TEST_DATABASE_URL)

# Set environment variables for the test process
os.environ["DATABASE_URL"] = TEST_DATABASE_URL
os.environ["INTERNAL_API_SECRET"] = "test-secret-key-1234567890-super-secure-key-32chars"
os.environ["NODE_ENV"] = "test"
os.environ["TEST_MOCK_LLM"] = "true"
os.environ["TEST_MOCK_EMBEDDING"] = "true"

from fastapi.testclient import TestClient
from app.database import get_db
from app.main import app

engine = create_engine(
    TEST_DATABASE_URL,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Ensure all internal database access inside endpoints uses isolated test database
import app.database as app_db
app_db.SessionLocal = TestingSessionLocal
app_db.engine = engine


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Build test database schema exclusively through Alembic migrations (no create_all or ad-hoc DDL)."""
    assert_safe_test_db(TEST_DATABASE_URL, engine)

    # 1. Clean existing table data if tables already exist
    with engine.begin() as conn:
        conn.execute(text("""
        DO $$
        DECLARE
            r RECORD;
        BEGIN
            FOR r IN (
                SELECT tablename FROM pg_tables 
                WHERE schemaname = 'public' AND tablename != 'alembic_version'
            ) LOOP
                EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE';
            END LOOP;
        END $$;
        """))

    # 2. Execute Alembic migrations to head on the isolated test database
    alembic_ini_path = str(backend_dir / "alembic.ini")
    alembic_cfg = Config(alembic_ini_path)
    alembic_cfg.set_main_option("sqlalchemy.url", TEST_DATABASE_URL)
    alembic_cfg.set_main_option("script_location", str(backend_dir / "alembic"))
    command.upgrade(alembic_cfg, "head")

    yield

    # 3. Teardown: clean data at session end while keeping schema intact
    assert_safe_test_db(TEST_DATABASE_URL, engine)
    with engine.begin() as conn:
        conn.execute(text("""
        DO $$
        DECLARE
            r RECORD;
        BEGIN
            FOR r IN (
                SELECT tablename FROM pg_tables 
                WHERE schemaname = 'public' AND tablename != 'alembic_version'
            ) LOOP
                EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE';
            END LOOP;
        END $$;
        """))


@pytest.fixture
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
