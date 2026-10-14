from typing import Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import User, Class, Enrollment, Assignment, Submission, GradeRevision
from app.models.enums import Role, AssignmentStatus
from app.security.dependencies import get_current_user

dashboard_router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@dashboard_router.get("")
async def get_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role == Role.DOSEN:
        classes = (
            db.query(Class)
            .filter(Class.dosenId == current_user.id, Class.isArchived == False)
            .order_by(Class.createdAt.desc())
            .all()
        )

        pending_count = (
            db.query(Submission)
            .join(Assignment, Assignment.id == Submission.assignmentId)
            .join(Class, Class.id == Assignment.classId)
            .filter(
                Class.dosenId == current_user.id,
                Submission.activeVersionId != None,
                Submission.releasedGradeId == None,
            )
            .count()
        )

        released_count = (
            db.query(Submission)
            .join(Assignment, Assignment.id == Submission.assignmentId)
            .join(Class, Class.id == Assignment.classId)
            .filter(
                Class.dosenId == current_user.id,
                Submission.releasedGradeId != None,
            )
            .count()
        )

        queue_subs = (
            db.query(Submission)
            .join(Assignment, Assignment.id == Submission.assignmentId)
            .join(Class, Class.id == Assignment.classId)
            .filter(
                Class.dosenId == current_user.id,
                Submission.activeVersionId != None,
                Submission.releasedGradeId == None,
            )
            .order_by(Submission.createdAt.desc())
            .limit(6)
            .all()
        )

        queue_data = [
            {
                "id": s.id,
                "createdAt": s.createdAt.isoformat() if s.createdAt else None,
                "user": {"name": s.user.name if s.user else ""},
                "assignment": {
                    "id": s.assignment.id,
                    "title": s.assignment.title,
                    "classId": s.assignment.classId,
                    "class": {"name": s.assignment.class_.name},
                },
            }
            for s in queue_subs
        ]

        classes_data = [
            {
                "id": c.id,
                "name": c.name,
                "subject": c.subject,
                "createdAt": c.createdAt.isoformat() if c.createdAt else None,
                "_count": {
                    "enrollments": len(c.enrollments),
                    "assignments": len(c.assignments),
                },
            }
            for c in classes
        ]

        return {
            "role": "DOSEN",
            "dosenData": {
                "classes": classes_data,
                "pending": pending_count,
                "released": released_count,
                "queue": queue_data,
            },
        }

    # Student view
    enrollments = (
        db.query(Enrollment)
        .filter(Enrollment.mahasiswaId == current_user.id)
        .all()
    )

    tasks = (
        db.query(Assignment)
        .join(Class, Class.id == Assignment.classId)
        .join(Enrollment, Enrollment.classId == Class.id)
        .filter(Enrollment.mahasiswaId == current_user.id, Assignment.status == AssignmentStatus.PUBLISHED)
        .order_by(Assignment.dueDate.asc())
        .limit(6)
        .all()
    )

    tasks_data = []
    for t in tasks:
        student_sub = (
            db.query(Submission)
            .filter(Submission.assignmentId == t.id, Submission.mahasiswaId == current_user.id)
            .first()
        )
        tasks_data.append({
            "id": t.id,
            "title": t.title,
            "dueDate": t.dueDate.isoformat() if t.dueDate else None,
            "classId": t.classId,
            "class": {"name": t.class_.name},
            "submissions": [{"id": student_sub.id}] if student_sub else [],
        })

    # Grades
    grades = (
        db.query(GradeRevision)
        .join(Submission, Submission.id == GradeRevision.submissionId)
        .filter(
            Submission.mahasiswaId == current_user.id,
            GradeRevision.status == "RELEASED",
            GradeRevision.id == Submission.releasedGradeId,
        )
        .order_by(GradeRevision.createdAt.desc())
        .all()
    )

    grades_data = [
        {
            "id": g.id,
            "finalScore": g.finalScore,
            "status": g.status,
            "createdAt": g.createdAt.isoformat() if g.createdAt else None,
            "submission": {
                "releasedGradeId": g.submission.releasedGradeId,
                "assignment": {
                    "id": g.submission.assignment.id,
                    "classId": g.submission.assignment.classId,
                    "title": g.submission.assignment.title,
                    "maxScore": g.submission.assignment.maxScore,
                },
            },
        }
        for g in grades
    ]

    return {
        "role": "MAHASISWA",
        "studentData": {
            "enrollments": [
                {"id": e.id, "class": {"id": e.class_.id, "name": e.class_.name}}
                for e in enrollments
            ],
            "tasks": tasks_data,
            "grades": grades_data,
        },
    }
