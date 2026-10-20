from app.routers.ai import ai_router
from app.routers.analytics import analytics_router
from app.routers.assignments import assignments_router
from app.routers.auth import auth_router
from app.routers.classes import classes_router
from app.routers.dashboard import dashboard_router
from app.routers.documents import documents_router
from app.routers.grades import grades_router
from app.routers.health import health_router
from app.routers.reference_sets import reference_sets_router
from app.routers.rubrics import rubrics_router
from app.routers.submissions import submissions_router

__all__ = [
    "ai_router",
    "analytics_router",
    "assignments_router",
    "auth_router",
    "classes_router",
    "dashboard_router",
    "documents_router",
    "grades_router",
    "health_router",
    "reference_sets_router",
    "rubrics_router",
    "submissions_router",
]
