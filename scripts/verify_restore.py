import hashlib
import os
import subprocess
import sys
from pathlib import Path
import psycopg2

def verify_backup_restore():
    print("=" * 70)
    print("PROVING DATABASE RESTORE FROM LOCAL DUMP TO ISOLATED DATABASE")
    print("=" * 70)

    # 1. Verify existence of local dump file in ./backups/
    repo_root = Path(__file__).resolve().parent.parent
    local_dump_path = repo_root / "backups" / "backup_ai_assessment_copilot.dump"

    print(f"\n[1] Checking local dump file on host:")
    if not local_dump_path.is_file():
        print(f"FATAL: Local dump file not found at: {local_dump_path}")
        sys.exit(1)

    file_size = local_dump_path.stat().st_size
    print(f"    Location: {local_dump_path}")
    print(f"    Size:     {file_size:,} bytes")
    print(f"    Status:   EXISTS and READABLE")

    # 2. Copy local dump to container
    container_dump_path = "/tmp/restore_verify_input.dump"
    print(f"\n[2] Copying local backup dump into container at {container_dump_path}...")
    cp_res = subprocess.run(
        ["docker", "cp", str(local_dump_path), f"ai_assessment_db:{container_dump_path}"],
        capture_output=True,
        text=True,
    )
    if cp_res.returncode != 0:
        print(f"FATAL: docker cp failed:\n{cp_res.stderr}")
        sys.exit(1)
    print("    Local file successfully transferred to container.")

    # 3. Prepare isolated database ai_assessment_restore_test (Two separate commands)
    print("\n[3] Preparing clean isolated database 'ai_assessment_restore_test'...")
    print("    Step 3a: Executing DROP DATABASE IF EXISTS ai_assessment_restore_test...")
    drop_res = subprocess.run(
        ["docker", "exec", "ai_assessment_db", "psql", "-U", "postgres", "-c", "DROP DATABASE IF EXISTS ai_assessment_restore_test;"],
        capture_output=True,
        text=True,
    )
    if drop_res.returncode != 0:
        print(f"FATAL: DROP DATABASE failed:\n{drop_res.stderr}")
        sys.exit(1)
    print("    Database dropped successfully.")

    print("    Step 3b: Executing CREATE DATABASE ai_assessment_restore_test...")
    create_res = subprocess.run(
        ["docker", "exec", "ai_assessment_db", "psql", "-U", "postgres", "-c", "CREATE DATABASE ai_assessment_restore_test;"],
        capture_output=True,
        text=True,
    )
    if create_res.returncode != 0:
        print(f"FATAL: CREATE DATABASE failed:\n{create_res.stderr}")
        sys.exit(1)
    print("    Database created successfully.")

    # 4. Execute pg_restore and strictly stop if it fails
    print(f"\n[4] Executing pg_restore from {container_dump_path}...")
    restore_res = subprocess.run(
        [
            "docker", "exec", "ai_assessment_db", "pg_restore",
            "-U", "postgres",
            "-d", "ai_assessment_restore_test",
            "--no-owner",
            "--no-privileges",
            container_dump_path,
        ],
        capture_output=True,
        text=True,
    )

    print(f"    pg_restore exit code: {restore_res.returncode}")
    if restore_res.returncode != 0:
        print("FATAL: pg_restore failed!")
        print(f"STDOUT:\n{restore_res.stdout}")
        print(f"STDERR:\n{restore_res.stderr}")
        sys.exit(1)
    print("    pg_restore completed with EXIT CODE 0.")

    # Connect to both databases for deep parity verification
    source_url = "postgresql://postgres:password@127.0.0.1:5432/ai_assessment_copilot"
    restored_url = "postgresql://postgres:password@127.0.0.1:5432/ai_assessment_restore_test"

    conn_src = psycopg2.connect(source_url)
    cur_src = conn_src.cursor()

    conn_rst = psycopg2.connect(restored_url)
    cur_rst = conn_rst.cursor()

    # 5. Verify pgvector extension, operations, and embedding dimension vector(768)
    print("\n[5] Verifying pgvector extension & operations on restored database:")
    cur_rst.execute("SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';")
    ext_row = cur_rst.fetchone()
    assert ext_row is not None, "pgvector extension is NOT installed on restored database!"
    print(f"    pgvector extension active: {ext_row[0]} (version {ext_row[1]})")

    # Strict assertion on cosine distance operations
    cur_rst.execute("SELECT '[1.0, 0.0, 0.0]'::vector <=> '[0.0, 1.0, 0.0]'::vector;")
    dist_orth = float(cur_rst.fetchone()[0])
    assert abs(dist_orth - 1.0) < 1e-6, f"Assertion failed: orthogonal cosine distance must be 1.0, got {dist_orth}"

    cur_rst.execute("SELECT '[1.0, 2.0, 3.0]'::vector <=> '[1.0, 2.0, 3.0]'::vector;")
    dist_ident = float(cur_rst.fetchone()[0])
    assert abs(dist_ident - 0.0) < 1e-6, f"Assertion failed: identical cosine distance must be 0.0, got {dist_ident}"

    cur_rst.execute("SELECT '[1.0, 0.0, 0.0]'::vector <=> '[-1.0, 0.0, 0.0]'::vector;")
    dist_opp = float(cur_rst.fetchone()[0])
    assert abs(dist_opp - 2.0) < 1e-6, f"Assertion failed: opposite cosine distance must be 2.0, got {dist_opp}"
    print(f"    pgvector cosine distance assertions passed (orthogonal=1.0, identical=0.0, opposite=2.0).")

    # Strict check on column embedding type AND dimension vector(768)
    cur_rst.execute("""
        SELECT format_type(atttypid, atttypmod)
        FROM pg_attribute
        WHERE attrelid = 'chunk_embeddings'::regclass AND attname = 'embedding';
    """)
    emb_type_row = cur_rst.fetchone()
    assert emb_type_row is not None, "chunk_embeddings.embedding column missing!"
    emb_format = emb_type_row[0].strip().lower()
    assert emb_format == "vector(768)", f"Expected chunk_embeddings.embedding to be 'vector(768)', got '{emb_format}'"
    print(f"    chunk_embeddings.embedding format_type verified: {emb_format} [OK]")

    # 6. Verify Tables Parity
    print("\n[6] Verifying all tables parity:")
    cur_src.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;")
    src_tables = [r[0] for r in cur_src.fetchall()]

    cur_rst.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;")
    rst_tables = [r[0] for r in cur_rst.fetchall()]

    assert src_tables == rst_tables, f"Tables mismatch! Source: {src_tables}, Restored: {rst_tables}"
    print(f"    Total tables: {len(rst_tables)} tables match 100%.")

    # 7. Verify FULL Index Definitions (not just keys/names)
    print("\n[7] Verifying FULL index definitions parity (table, name, and indexdef):")
    cur_src.execute("""
        SELECT tablename, indexname, indexdef 
        FROM pg_indexes 
        WHERE schemaname='public' 
        ORDER BY tablename, indexname;
    """)
    src_indexes = {(r[0], r[1]): r[2].strip() for r in cur_src.fetchall()}

    cur_rst.execute("""
        SELECT tablename, indexname, indexdef 
        FROM pg_indexes 
        WHERE schemaname='public' 
        ORDER BY tablename, indexname;
    """)
    rst_indexes = {(r[0], r[1]): r[2].strip() for r in cur_rst.fetchall()}

    assert ("chunk_embeddings", "chunk_embeddings_embedding_hnsw_idx") in rst_indexes, \
        "Missing HNSW vector index on restored DB!"
    hnsw_def = rst_indexes[("chunk_embeddings", "chunk_embeddings_embedding_hnsw_idx")]
    assert "USING hnsw (embedding vector_cosine_ops)" in hnsw_def, f"Invalid HNSW index definition: {hnsw_def}"

    # Assert complete dictionary equality of (table, name) -> full index definition
    assert src_indexes == rst_indexes, f"Index definition mismatch! Differences: {set(src_indexes.items()) ^ set(rst_indexes.items())}"
    print(f"    All {len(rst_indexes)} index definitions match 100% (including HNSW vector_cosine_ops).")

    # 8. Verify FULL Constraints (Identified by Schema, Table, and Name)
    print("\n[8] Verifying FULL constraint definitions parity (by schema, table, name):")
    constraint_query = """
        SELECT 
            n.nspname AS schema_name,
            c.relname AS table_name,
            con.conname AS constraint_name,
            con.contype AS constraint_type,
            pg_get_constraintdef(con.oid, true) AS constraint_def
        FROM pg_constraint con
        JOIN pg_class c ON c.oid = con.conrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
        ORDER BY schema_name, table_name, constraint_name;
    """
    cur_src.execute(constraint_query)
    src_constraints = {(r[0], r[1], r[2]): (r[3], r[4].strip()) for r in cur_src.fetchall()}

    cur_rst.execute(constraint_query)
    rst_constraints = {(r[0], r[1], r[2]): (r[3], r[4].strip()) for r in cur_rst.fetchall()}

    assert ("public", "chunk_embeddings", "chunk_embeddings_dimension_check") in rst_constraints, \
        "Missing chunk_embeddings_dimension_check on restored DB!"
    assert ("public", "jobs", "jobs_attempts_check") in rst_constraints, \
        "Missing jobs_attempts_check on restored DB!"

    # Assert complete dictionary equality of (schema, table, name) -> (type, full definition)
    assert src_constraints == rst_constraints, \
        f"Constraint definition mismatch! Differences: {set(src_constraints.items()) ^ set(rst_constraints.items())}"
    print(f"    All {len(rst_constraints)} constraint definitions match 100% across (schema, table, name).")

    # 9. Deep Data Content Parity (Comparing row contents and SHA-256 digests)
    print("\n[9] Verifying exact data contents across all tables:")
    all_content_matched = True
    for t in src_tables:
        cur_src.execute(f'SELECT count(*) FROM "{t}"')
        cnt_src = cur_src.fetchone()[0]
        cur_rst.execute(f'SELECT count(*) FROM "{t}"')
        cnt_rst = cur_rst.fetchone()[0]

        cur_src.execute(f'SELECT * FROM "{t}" ORDER BY 1;')
        rows_src = cur_src.fetchall()
        cur_rst.execute(f'SELECT * FROM "{t}" ORDER BY 1;')
        rows_rst = cur_rst.fetchall()

        hash_src = hashlib.sha256(str(rows_src).encode('utf-8')).hexdigest()
        hash_rst = hashlib.sha256(str(rows_rst).encode('utf-8')).hexdigest()

        match = (cnt_src == cnt_rst) and (hash_src == hash_rst)
        if not match:
            all_content_matched = False
            print(f"    - {t:<30} MISMATCH: src_count={cnt_src}, rst_count={cnt_rst}")
        else:
            print(f"    - {t:<30} MATCH: {cnt_rst} rows, SHA256={hash_rst[:12]}...")

    assert all_content_matched, "Data content mismatch detected between source and restored database!"

    # Clean up container temporary file
    subprocess.run(["docker", "exec", "ai_assessment_db", "rm", "-f", container_dump_path], check=True)

    conn_src.close()
    conn_rst.close()

    print("\n" + "=" * 70)
    print("SUCCESS: 100% PARITY CONFIRMED ACROSS TABLES, DATA, CONSTRAINTS, INDEXES, AND PGVECTOR!")
    print("=" * 70)

if __name__ == "__main__":
    verify_backup_restore()
