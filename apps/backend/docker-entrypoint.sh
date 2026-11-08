#!/bin/sh
# Wait for the database, migrate, optionally seed demo data, then serve.
set -e

echo "Menunggu database..."
python - <<'PY'
import sys
import time

from sqlalchemy import create_engine, text

from app.database import db_url

for attempt in range(60):
    try:
        with create_engine(db_url).connect() as conn:
            conn.execute(text("SELECT 1"))
        print("Database siap.")
        sys.exit(0)
    except Exception as exc:  # noqa: BLE001 - any failure means "not ready yet"
        print(f"  belum siap ({attempt + 1}/60): {type(exc).__name__}")
        time.sleep(2)
print("Database tidak dapat dihubungi setelah 120 detik.")
sys.exit(1)
PY

alembic upgrade head

if [ "${SEED_DEMO:-false}" = "true" ]; then
    python -m app.seed_demo
fi

# One worker on purpose: AI drafts run as in-process background jobs (app/services/grading_jobs.py).
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-3001}" --workers 1 --proxy-headers
