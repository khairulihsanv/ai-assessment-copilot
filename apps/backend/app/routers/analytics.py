from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import User, Class, Assignment, Submission, GradeRevision
from app.models.enums import Role
from app.security.dependencies import get_current_user

analytics_router = APIRouter(prefix="/analytics", tags=["analytics"])


@analytics_router.get("")
async def get_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != Role.DOSEN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized")

    classes_count = db.query(Class).filter(Class.dosenId == current_user.id).count()
    assignments_count = (
        db.query(Assignment)
        .join(Class, Class.id == Assignment.classId)
        .filter(Class.dosenId == current_user.id)
        .count()
    )
    submissions_count = (
        db.query(Submission)
        .join(Assignment, Assignment.id == Submission.assignmentId)
        .join(Class, Class.id == Assignment.classId)
        .filter(Class.dosenId == current_user.id)
        .count()
    )
    grades_count = db.query(GradeRevision).filter(GradeRevision.gradedById == current_user.id).count()

    return {
        "classesCount": classes_count,
        "assignmentsCount": assignments_count,
        "submissionsCount": submissions_count,
        "gradesCount": grades_count,
    }
