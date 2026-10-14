import random
import string
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.models import Class, Enrollment, User, Assignment, Rubric, Submission, GradeRevision
from app.models.enums import Role, ClassRole, AssignmentStatus
from app.schemas.class_schemas import CreateClassSchema, UpdateClassSchema, JoinClassSchema
from app.security.dependencies import get_current_user

classes_router = APIRouter(prefix="/classes", tags=["classes"])


def generate_enrollment_key() -> str:
    chars = string.ascii_uppercase + string.digits
    return "".join(random.choices(chars, k=6))


@classes_router.get("")
async def get_classes(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    is_dosen = current_user.role == Role.DOSEN

    if is_dosen:
        classes = (
            db.query(Class)
            .filter(Class.dosenId == current_user.id)
            .order_by(Class.createdAt.desc())
            .all()
        )
    else:
        classes = (
            db.query(Class)
            .join(Enrollment, Enrollment.classId == Class.id)
            .filter(Enrollment.mahasiswaId == current_user.id)
            .order_by(Class.createdAt.desc())
            .all()
        )

    result = []
    for c in classes:
        enrollment_count = db.query(Enrollment).filter(Enrollment.classId == c.id).count()
        assignment_count = db.query(Assignment).filter(Assignment.classId == c.id).count()

        item: Dict[str, Any] = {
            "id": c.id,
            "name": c.name,
            "description": c.description,
            "subject": c.subject,
            "isArchived": c.isArchived,
            "createdAt": c.createdAt.isoformat() if c.createdAt else None,
            "dosenId": c.dosenId,
            "dosen": {"name": c.dosen.name if c.dosen else ""},
            "_count": {
                "enrollments": enrollment_count,
                "assignments": assignment_count,
            },
        }
        if is_dosen:
            item["enrollmentKey"] = c.enrollmentKey

        result.append(item)

    return result


@classes_router.post("", status_code=status.HTTP_201_CREATED)
async def create_class(
    req: CreateClassSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != Role.DOSEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized",
        )

    # Generate unique key
    for _ in range(5):
        key = generate_enrollment_key()
        if not db.query(Class).filter(Class.enrollmentKey == key).first():
            break

    new_class = Class(
        name=req.name,
        description=req.description,
        subject=req.subject,
        dosenId=current_user.id,
        enrollmentKey=key,
    )
    db.add(new_class)
    db.commit()
    db.refresh(new_class)

    return {
        "id": new_class.id,
        "name": new_class.name,
        "description": new_class.description,
        "subject": new_class.subject,
        "enrollmentKey": new_class.enrollmentKey,
        "isArchived": new_class.isArchived,
        "createdAt": new_class.createdAt.isoformat() if new_class.createdAt else None,
        "dosenId": new_class.dosenId,
    }


@classes_router.post("/join", status_code=status.HTTP_201_CREATED)
async def join_class(
    req: JoinClassSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != Role.MAHASISWA:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Hanya mahasiswa yang dapat bergabung ke kelas",
        )

    clean_key = req.enrollmentKey.strip().upper()
    cls = db.query(Class).filter(Class.enrollmentKey == clean_key).first()

    if not cls:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kode kelas tidak ditemukan. Pastikan kode yang Anda masukkan benar.",
        )

    if cls.isArchived:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kelas ini sudah diarsipkan oleh dosen pengajar.",
        )

    existing = (
        db.query(Enrollment)
        .filter(Enrollment.classId == cls.id, Enrollment.mahasiswaId == current_user.id)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Anda sudah terdaftar di kelas ini.",
        )

    enrollment = Enrollment(
        classId=cls.id,
        mahasiswaId=current_user.id,
        role=ClassRole.STUDENT,
    )
    db.add(enrollment)
    db.commit()

    return {"success": True, "classId": cls.id, "className": cls.name}


@classes_router.get("/{class_id}")
async def get_class_detail(
    class_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cls = db.query(Class).filter(Class.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kelas tidak ditemukan")

    is_dosen = current_user.role == Role.DOSEN and cls.dosenId == current_user.id
    enrollment = (
        db.query(Enrollment)
        .filter(Enrollment.classId == class_id, Enrollment.mahasiswaId == current_user.id)
        .first()
    )
    is_assistant = enrollment and enrollment.role == ClassRole.ASSISTANT
    is_privileged = is_dosen or is_assistant

    if not is_privileged and not enrollment:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Akses ditolak")

    # Enrollments
    enrollment_list = (
        db.query(Enrollment)
        .filter(Enrollment.classId == class_id)
        .order_by(Enrollment.joinedAt.asc())
        .all()
    )
    enrollments_data = [
        {
            "id": e.id,
            "role": e.role.value if hasattr(e.role, "value") else str(e.role),
            "joinedAt": e.joinedAt.isoformat() if e.joinedAt else None,
            "user": {
                "id": e.user.id,
                "name": e.user.name,
                "email": e.user.email,
                "createdAt": e.user.createdAt.isoformat() if e.user.createdAt else None,
            }
            if e.user
            else None,
        }
        for e in enrollment_list
    ]

    # Assignments
    assign_query = db.query(Assignment).filter(Assignment.classId == class_id)
    if not is_privileged:
        assign_query = assign_query.filter(Assignment.status != AssignmentStatus.DRAFT)
    assignments = assign_query.order_by(Assignment.dueDate.asc()).all()

    assignments_data = []
    for a in assignments:
        sub_query = db.query(Submission).filter(Submission.assignmentId == a.id)
        if not is_privileged:
            sub_query = sub_query.filter(Submission.mahasiswaId == current_user.id)
        subs = sub_query.all()

        subs_data = []
        for s in subs:
            # Grades
            grades_data = []
            for g in s.grades:
                if is_privileged:
                    grades_data.append({
                        "id": g.id,
                        "status": g.status,
                        "finalScore": g.finalScore,
                        "finalFeedback": g.finalFeedback,
                        "isAIAssisted": g.isAIAssisted,
                        "createdAt": g.createdAt.isoformat() if g.createdAt else None,
                    })
                elif g.status == "RELEASED":
                    grades_data.append({
                        "id": g.id,
                        "status": g.status,
                        "finalScore": g.finalScore,
                        "finalFeedback": g.finalFeedback,
                        "isAIAssisted": g.isAIAssisted,
                        "createdAt": g.createdAt.isoformat() if g.createdAt else None,
                    })

            released_grade = next((g for g in grades_data if g["id"] == s.releasedGradeId), None)

            subs_data.append({
                "id": s.id,
                "assignmentId": s.assignmentId,
                "userId": s.mahasiswaId,
                "activeVersionId": s.activeVersionId,
                "releasedGradeId": s.releasedGradeId,
                "createdAt": s.createdAt.isoformat() if s.createdAt else None,
                "grades": grades_data,
                "released": released_grade,
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

        sub_count = db.query(Submission).filter(Submission.assignmentId == a.id).count()

        assignments_data.append({
            "id": a.id,
            "title": a.title,
            "instructions": a.instructions,
            "submissionType": a.submissionType.value if hasattr(a.submissionType, "value") else str(a.submissionType),
            "dueDate": a.dueDate.isoformat() if a.dueDate else None,
            "maxScore": a.maxScore,
            "allowLateSubmission": a.allowLateSubmission,
            "status": a.status.value if hasattr(a.status, "value") else str(a.status),
            "createdAt": a.createdAt.isoformat() if a.createdAt else None,
            "submissions": subs_data,
            "_count": {"submissions": sub_count},
        })

    # Rubrics
    rubrics = (
        db.query(Rubric)
        .filter(Rubric.classId == class_id)
        .order_by(Rubric.createdAt.desc())
        .all()
    )
    rubrics_data = []
    for r in rubrics:
        crit_data = []
        for cr in r.criteria:
            item = {
                "id": cr.id,
                "label": cr.label,
                "description": cr.description,
                "maxScore": cr.maxScore,
                "weight": cr.weight,
                "rubricId": cr.rubricId,
            }
            if is_privileged:
                item["expectedAnswer"] = cr.expectedAnswer
                item["answerKey"] = cr.answerKey
                item["material"] = cr.material
            crit_data.append(item)

        rubrics_data.append({
            "id": r.id,
            "title": r.title,
            "createdAt": r.createdAt.isoformat() if r.createdAt else None,
            "classId": r.classId,
            "createdById": r.createdById,
            "_count": {"assignments": len(r.assignments)},
            "criteria": crit_data,
        })

    return {
        "id": cls.id,
        "name": cls.name,
        "description": cls.description,
        "subject": cls.subject,
        "isArchived": cls.isArchived,
        "createdAt": cls.createdAt.isoformat() if cls.createdAt else None,
        "dosenId": cls.dosenId,
        "enrollmentKey": cls.enrollmentKey if is_privileged else None,
        "dosen": {
            "id": cls.dosen.id,
            "name": cls.dosen.name,
            "email": cls.dosen.email,
        }
        if cls.dosen
        else None,
        "enrollments": enrollments_data,
        "assignments": assignments_data,
        "rubrics": rubrics_data,
        "_count": {
            "enrollments": len(enrollment_list),
            "assignments": len(assignments),
        },
    }


@classes_router.patch("/{class_id}")
async def update_class(
    class_id: str,
    req: UpdateClassSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != Role.DOSEN:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")

    cls = db.query(Class).filter(Class.id == class_id).first()
    if not cls or cls.dosenId != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kelas tidak ditemukan")

    if req.name is not None:
        cls.name = req.name
    if req.description is not None:
        cls.description = req.description
    if req.subject is not None:
        cls.subject = req.subject
    if req.isArchived is not None:
        cls.isArchived = req.isArchived

    db.commit()
    db.refresh(cls)

    return {
        "id": cls.id,
        "name": cls.name,
        "description": cls.description,
        "subject": cls.subject,
        "enrollmentKey": cls.enrollmentKey,
        "isArchived": cls.isArchived,
        "createdAt": cls.createdAt.isoformat() if cls.createdAt else None,
        "dosenId": cls.dosenId,
    }


@classes_router.delete("/{class_id}")
async def delete_class(
    class_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != Role.DOSEN:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")

    cls = db.query(Class).filter(Class.id == class_id).first()
    if not cls or cls.dosenId != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kelas tidak ditemukan")

    db.delete(cls)
    db.commit()

    return {"success": True}


@classes_router.post("/{class_id}/regenerate-key")
async def regenerate_key(
    class_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != Role.DOSEN:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")

    cls = db.query(Class).filter(Class.id == class_id).first()
    if not cls or cls.dosenId != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kelas tidak ditemukan")

    new_key = generate_enrollment_key()
    cls.enrollmentKey = new_key
    db.commit()

    return {"success": True, "newKey": new_key}
