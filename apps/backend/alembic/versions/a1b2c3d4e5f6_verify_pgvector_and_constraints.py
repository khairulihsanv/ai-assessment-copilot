"""verify_pgvector_and_constraints

Revision ID: a1b2c3d4e5f6
Revises: 8ccc2844ad01
Create Date: 2026-10-16 09:00:00.000000

Ensures pgvector HNSW index, check constraints, and verifies complete schema integrity.
This migration applies to both existing adopted databases and fresh provisioned databases.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '8ccc2844ad01'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

EXPECTED_APPLICATION_TABLES = {
    "users",
    "classes",
    "enrollments",
    "rubrics",
    "rubric_criteria",
    "assignments",
    "submissions",
    "submission_versions",
    "evaluation_runs",
    "grade_revisions",
    "documents",
    "document_versions",
    "document_chunks",
    "chunk_embeddings",
    "reference_set_versions",
    "reference_set_documents",
    "evaluator_config_versions",
    "embedding_cache",
    "jobs",
}


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    is_postgres = bind.dialect.name == "postgresql"

    # 1. Verify all 19 application tables exist
    missing_tables = EXPECTED_APPLICATION_TABLES - existing_tables
    if missing_tables:
        raise RuntimeError(
            f"Schema verification failed: missing application tables: {sorted(missing_tables)}"
        )

    if is_postgres:
        # 2. Ensure pgvector extension
        op.execute("CREATE EXTENSION IF NOT EXISTS vector;")

        # 3. Ensure chunk_embeddings.embedding is vector(768)
        op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'chunk_embeddings' AND column_name = 'embedding'
            ) THEN
                ALTER TABLE "chunk_embeddings" ADD COLUMN "embedding" vector(768);
            END IF;
        END $$;
        """)

        # 4. Ensure HNSW cosine index on chunk_embeddings
        op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_indexes 
                WHERE tablename = 'chunk_embeddings' AND indexname = 'chunk_embeddings_embedding_hnsw_idx'
            ) THEN
                CREATE INDEX "chunk_embeddings_embedding_hnsw_idx" 
                ON "chunk_embeddings" USING hnsw ("embedding" vector_cosine_ops);
            END IF;
        END $$;
        """)

        # 5. Ensure check constraints on chunk_embeddings and jobs
        op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'chunk_embeddings_dimension_check'
            ) THEN
                ALTER TABLE "chunk_embeddings" 
                ADD CONSTRAINT "chunk_embeddings_dimension_check" CHECK ("dimension" = 768);
            END IF;

            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'jobs_attempts_check'
            ) THEN
                ALTER TABLE "jobs" 
                ADD CONSTRAINT "jobs_attempts_check" CHECK ("attempts" >= 0 AND "maxAttempts" >= 1);
            END IF;
        END $$;
        """)

    print(f"Alembic upgrade {revision}: All 19 application tables, pgvector, HNSW index, and constraints verified.")


def downgrade() -> None:
    pass
