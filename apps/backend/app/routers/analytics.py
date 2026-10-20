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
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized"
        )

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
    grades_count = (
        db.query(GradeRevision)
        .filter(GradeRevision.gradedById == current_user.id)
        .count()
    )

    released = (
        db.query(GradeRevision, Submission, Assignment, Class, User)
        .join(Submission, Submission.releasedGradeId == GradeRevision.id)
        .join(Assignment, Assignment.id == Submission.assignmentId)
        .join(Class, Class.id == Assignment.classId)
        .join(User, User.id == Submission.mahasiswaId)
        .filter(Class.dosenId == current_user.id, GradeRevision.status == "RELEASED")
        .all()
    )
    distribution = [
        {"label": "85–100", "count": 0},
        {"label": "70–<85", "count": 0},
        {"label": "55–<70", "count": 0},
        {"label": "<55", "count": 0},
    ]
    grade_rows = []
    for grade, submission, assignment, cls, student in released:
        if assignment.maxScore > 0:
            percent = grade.finalScore / assignment.maxScore * 100
            bucket = (
                0
                if percent >= 85
                else 1 if percent >= 70 else 2 if percent >= 55 else 3
            )
            distribution[bucket]["count"] += 1
        grade_rows.append(
            {
                "id": grade.id,
                "student": student.name,
                "className": cls.name,
                "assignment": assignment.title,
                "score": grade.finalScore,
                "maxScore": assignment.maxScore,
                "releasedAt": grade.createdAt.isoformat() if grade.createdAt else None,
            }
        )
    return {
        "classesCount": classes_count,
        "assignmentsCount": assignments_count,
        "submissionsCount": submissions_count,
        "gradesCount": grades_count,
        "releasedCount": len(grade_rows),
        "distribution": distribution,
        "gradeRows": grade_rows,
    }
