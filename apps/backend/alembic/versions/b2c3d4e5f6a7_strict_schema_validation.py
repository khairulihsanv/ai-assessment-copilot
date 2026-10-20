"""strict_schema_validation

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-10-16 09:30:00.000000

Strictly validates existing and newly-provisioned schemas for pgvector column types,
HNSW index operator classes, and check constraint expressions.
Halts with explicit error if schema does not conform; never silently mutates or drops data.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"
    if not is_postgres:
        return

    # 1. Validate chunk_embeddings.embedding type and dimension: must be vector(768)
    row = bind.execute(sa.text("""
        SELECT format_type(atttypid, atttypmod) AS col_type
        FROM pg_attribute
        WHERE attrelid = 'chunk_embeddings'::regclass AND attname = 'embedding';
    """)).fetchone()

    if not row or not row[0]:
        raise RuntimeError(
            "SCHEMA VALIDATION ERROR: Column 'embedding' is missing from table 'chunk_embeddings'. "
            "Refusing to alter schema or delete data silently."
        )

    col_type = row[0].strip().lower()
    if col_type != "vector(768)":
        raise RuntimeError(
            f"SCHEMA VALIDATION ERROR: Column 'chunk_embeddings.embedding' must have type 'vector(768)', "
            f"but found '{col_type}'. Refusing to alter schema or delete data silently."
        )

    # 2. Validate HNSW index method, column, and operator class
    idx_row = bind.execute(sa.text("""
        SELECT 
            c.relname AS index_name,
            am.amname AS access_method,
            a.attname AS column_name,
            opc.opcname AS opclass_name
        FROM pg_index i
        JOIN pg_class c ON c.oid = i.indexrelid
        JOIN pg_class t ON t.oid = i.indrelid
        JOIN pg_am am ON am.oid = c.relam
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(i.indkey)
        JOIN pg_opclass opc ON opc.oid = i.indclass[0]
        WHERE t.relname = 'chunk_embeddings' AND c.relname = 'chunk_embeddings_embedding_hnsw_idx';
    """)).fetchone()

    if not idx_row:
        raise RuntimeError(
            "SCHEMA VALIDATION ERROR: Required index 'chunk_embeddings_embedding_hnsw_idx' is missing on 'chunk_embeddings'. "
            "Refusing to alter schema or delete data silently."
        )

    idx_name, access_method, column_name, opclass_name = idx_row
    if access_method != "hnsw":
        raise RuntimeError(
            f"SCHEMA VALIDATION ERROR: Index '{idx_name}' access method must be 'hnsw', but found '{access_method}'."
        )
    if column_name != "embedding":
        raise RuntimeError(
            f"SCHEMA VALIDATION ERROR: Index '{idx_name}' indexed column must be 'embedding', but found '{column_name}'."
        )
    if opclass_name != "vector_cosine_ops":
        raise RuntimeError(
            f"SCHEMA VALIDATION ERROR: Index '{idx_name}' operator class must be 'vector_cosine_ops', but found '{opclass_name}'."
        )

    # 3. Validate check constraint expressions
    con_rows = bind.execute(sa.text("""
        SELECT conname, pg_get_constraintdef(oid) AS condef
        FROM pg_constraint
        WHERE conname IN ('chunk_embeddings_dimension_check', 'jobs_attempts_check');
    """)).fetchall()

    con_map = {r[0]: r[1] for r in con_rows}

    if "chunk_embeddings_dimension_check" not in con_map:
        raise RuntimeError(
            "SCHEMA VALIDATION ERROR: Check constraint 'chunk_embeddings_dimension_check' is missing on 'chunk_embeddings'."
        )
    dim_check = con_map["chunk_embeddings_dimension_check"]
    if "dimension = 768" not in dim_check:
        raise RuntimeError(
            f"SCHEMA VALIDATION ERROR: Constraint 'chunk_embeddings_dimension_check' definition mismatch. "
            f"Expected 'dimension = 768' in definition, got: '{dim_check}'."
        )

    if "jobs_attempts_check" not in con_map:
        raise RuntimeError(
            "SCHEMA VALIDATION ERROR: Check constraint 'jobs_attempts_check' is missing on 'jobs'."
        )
    jobs_check = con_map["jobs_attempts_check"]
    if "attempts >= 0" not in jobs_check or 'maxAttempts" >= 1' not in jobs_check:
        raise RuntimeError(
            f"SCHEMA VALIDATION ERROR: Constraint 'jobs_attempts_check' definition mismatch. "
            f"Expected 'attempts >= 0' and 'maxAttempts >= 1' in definition, got: '{jobs_check}'."
        )

    print(
        f"Alembic strict validation {revision}: All schema constraints, pgvector(768) type, "
        f"and HNSW index (method: hnsw, col: embedding, opclass: vector_cosine_ops) verified successfully."
    )


def downgrade() -> None:
    pass
