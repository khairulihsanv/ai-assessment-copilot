import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.routers import (
    ai_router,
    analytics_router,
    assignments_router,
    auth_router,
    classes_router,
    dashboard_router,
    documents_router,
    grades_router,
    health_router,
    reference_sets_router,
    rubrics_router,
    submissions_router,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("dexa-backend")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Dexa Assessment FastAPI Backend...")
    # Schema management is strictly handled by Alembic migrations.
    # No auto-creation via Base.metadata.create_all to ensure reproducible schemas.
    yield
    logger.info("Shutting down Dexa Assessment Backend...")


app = FastAPI(
    title="Dexa Assessment API",
    description="Backend API for Dexa Assessment Copilot — built with FastAPI & Python",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for local dev / Vercel proxy
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global unhandled error: {exc}", exc_info=exc)
    return JSONResponse(
        status_code=500,
        content={"error": "Terjadi kesalahan internal server.", "detail": str(exc) if settings.ENVIRONMENT != "production" else None},
    )


# Include Routers
app.include_router(health_router)
app.include_router(auth_router)
app.include_router(classes_router)
app.include_router(assignments_router)
app.include_router(rubrics_router)
app.include_router(submissions_router)
app.include_router(documents_router)
app.include_router(reference_sets_router)
app.include_router(dashboard_router)
app.include_router(analytics_router)
app.include_router(grades_router)
app.include_router(ai_router)
