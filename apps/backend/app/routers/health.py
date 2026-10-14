from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db

health_router = APIRouter(tags=["health"])


@health_router.get("/health")
async def health_check():
    """Liveness probe: verifies the HTTP API is accepting requests."""
    return {"status": "ok", "service": "dexa-assessment-fastapi"}


@health_router.get("/health/ready")
async def readiness_check(db: Session = Depends(get_db)):
    """Readiness probe: verifies database connectivity without leaking configuration."""
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ready", "database": "connected"}
    except Exception:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "unavailable", "database": "disconnected"},
        )
