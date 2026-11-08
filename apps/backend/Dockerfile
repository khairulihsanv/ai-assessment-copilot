# Dexa Assessment backend (FastAPI). Used by docker compose and by hosts such as Render.
FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=3001 \
    STORAGE_DIR=/app/storage

# libpq: PostgreSQL client. libgl1 + libglib2.0-0: OpenCV runtime for the OCR scanner. curl: health check.
RUN apt-get update && apt-get install -y --no-install-recommends \
        libpq-dev libgl1 libglib2.0-0 curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
# Windows checkouts may add CR line endings, which break the shell script.
RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh && mkdir -p "$STORAGE_DIR"

EXPOSE 3001

HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
    CMD curl -fsS "http://127.0.0.1:${PORT}/health" || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
