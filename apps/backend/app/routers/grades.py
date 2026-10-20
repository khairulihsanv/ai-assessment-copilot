from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.enums import Role
from app.models.models import Assignment, Class, GradeRevision, Submission, User
from app.security.dependencies import get_current_user

grades_router = APIRouter(tags=["grades"])


@grades_router.get("/grades")
async def get_student_grades(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    candidates = (
        db.query(GradeRevision)
        .join(Submission, Submission.id == GradeRevision.submissionId)
        .filter(Submission.mahasiswaId == current_user.id, GradeRevision.status == "RELEASED")
        .order_by(GradeRevision.createdAt.desc())
        .all()
    )

    grades = []
    for g in candidates:
        if g.id == g.submission.releasedGradeId:
            grades.append({
                "id": g.id,
                "finalScore": g.finalScore,
                "finalFeedback": g.finalFeedback,
                "status": g.status,
                "createdAt": g.createdAt.isoformat() if g.createdAt else None,
                "submissionId": g.submissionId,
                "submission": {
                    "id": g.submission.id,
                    "releasedGradeId": g.submission.releasedGradeId,
                    "assignment": {
                        "id": g.submission.assignment.id,
                        "title": g.submission.assignment.title,
                        "maxScore": g.submission.assignment.maxScore,
                        "class": {
                            "id": g.submission.assignment.class_.id,
                            "name": g.submission.assignment.class_.name,
                            "subject": g.submission.assignment.class_.subject,
                        },
                    },
                },
                "gradedBy": {"name": g.graded_by.name if g.graded_by else ""},
            })

    return grades


@grades_router.get("/grading-hub")
async def get_grading_hub(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != Role.DOSEN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized")

    submissions = (
        db.query(Submission)
        .join(Assignment, Assignment.id == Submission.assignmentId)
        .join(Class, Class.id == Assignment.classId)
        .filter(Class.dosenId == current_user.id)
        .order_by(Submission.createdAt.desc())
        .all()
    )

    rows = []
    for s in submissions:
        released = next(
            (
                {
                    "id": g.id,
                    "finalScore": g.finalScore,
                    "status": g.status,
                    "createdAt": g.createdAt.isoformat() if g.createdAt else None,
                }
                for g in s.grades
                if g.id == s.releasedGradeId and g.status == "RELEASED"
            ),
            None,
        )

        has_draft = any(e.versionId == s.activeVersionId for e in s.evaluations)

        rows.append({
            "id": s.id,
            "assignmentId": s.assignmentId,
            "activeVersionId": s.activeVersionId,
            "releasedGradeId": s.releasedGradeId,
            "createdAt": s.createdAt.isoformat() if s.createdAt else None,
            "user": {
                "id": s.user.id,
                "name": s.user.name,
                "email": s.user.email,
            }
            if s.user
            else None,
            "assignment": {
                "id": s.assignment.id,
                "title": s.assignment.title,
                "maxScore": s.assignment.maxScore,
                "classId": s.assignment.classId,
                "class": {
                    "name": s.assignment.class_.name,
                    "subject": s.assignment.class_.subject,
                },
                "rubric": {"title": s.assignment.rubric.title} if s.assignment.rubric else None,
            },
            "released": released,
            "hasDraft": has_draft,
            "versions": [
                {
                    "id": v.id,
                    "versionNumber": v.versionNumber,
                    "type": v.type.value if hasattr(v.type, "value") else str(v.type),
                    "submittedAt": v.submittedAt.isoformat() if v.submittedAt else None,
                }
                for v in s.versions
            ],
        })

    return rows
