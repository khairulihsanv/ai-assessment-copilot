from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Class, Enrollment, User, Rubric, RubricCriterion
from app.models.enums import Role, ClassRole
from app.schemas.rubric_schemas import CreateRubricSchema, UpdateRubricSchema
from app.security.dependencies import get_current_user
from app.services.embedding_service import generate_embedding

rubrics_router = APIRouter(tags=["rubrics"])


@rubrics_router.get("/classes/{class_id}/rubrics")
async def list_rubrics(
    class_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cls = db.query(Class).filter(Class.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kelas tidak ditemukan")

    is_dosen = cls.dosenId == current_user.id
    enrollment = (
        db.query(Enrollment)
        .filter(Enrollment.classId == class_id, Enrollment.mahasiswaId == current_user.id)
        .first()
    )
    is_assistant = enrollment and enrollment.role == ClassRole.ASSISTANT
    is_privileged = is_dosen or is_assistant

    if not is_privileged and not enrollment:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Akses ditolak")

    rubrics = (
        db.query(Rubric)
        .filter(Rubric.classId == class_id)
        .order_by(Rubric.createdAt.desc())
        .all()
    )

    result = []
    for r in rubrics:
        crit_list = []
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
            crit_list.append(item)

        result.append({
            "id": r.id,
            "title": r.title,
            "createdAt": r.createdAt.isoformat() if r.createdAt else None,
            "classId": r.classId,
            "createdById": r.createdById,
            "_count": {"assignments": len(r.assignments)},
            "criteria": crit_list,
        })

    return result


@rubrics_router.post("/classes/{class_id}/rubrics", status_code=status.HTTP_201_CREATED)
async def create_rubric(
    class_id: str,
    req: CreateRubricSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != Role.DOSEN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Hanya dosen yang dapat membuat rubrik penilaian")

    cls = db.query(Class).filter(Class.id == class_id).first()
    if not cls or cls.dosenId != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Kelas tidak ditemukan atau Anda bukan pengajar di kelas ini")

    rubric = Rubric(
        title=req.title,
        classId=class_id,
        createdById=current_user.id,
    )
    db.add(rubric)
    db.commit()
    db.refresh(rubric)

    for cr in req.criteria:
        ak_emb = None
        mat_emb = None
        if cr.answerKey and cr.answerKey.strip():
            ak_emb = await generate_embedding(cr.answerKey)
        if cr.material and cr.material.strip():
            mat_emb = await generate_embedding(cr.material)

        crit = RubricCriterion(
            rubricId=rubric.id,
            label=cr.label,
            description=cr.description,
            maxScore=cr.maxScore,
            weight=cr.weight,
            expectedAnswer=cr.expectedAnswer,
            answerKey=cr.answerKey,
            material=cr.material,
            answerKeyEmbedding=ak_emb,
            materialEmbedding=mat_emb,
        )
        db.add(crit)

    db.commit()
    db.refresh(rubric)

    return {
        "id": rubric.id,
        "title": rubric.title,
        "classId": rubric.classId,
        "createdById": rubric.createdById,
        "createdAt": rubric.createdAt.isoformat() if rubric.createdAt else None,
    }


@rubrics_router.get("/classes/{class_id}/rubrics/{rubric_id}")
async def get_rubric_detail(
    class_id: str,
    rubric_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rubric = (
        db.query(Rubric)
        .filter(Rubric.id == rubric_id, Rubric.classId == class_id)
        .first()
    )
    if not rubric:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rubrik tidak ditemukan")

    is_dosen = rubric.class_.dosenId == current_user.id
    enrollment = (
        db.query(Enrollment)
        .filter(Enrollment.classId == class_id, Enrollment.mahasiswaId == current_user.id)
        .first()
    )
    is_assistant = enrollment and enrollment.role == ClassRole.ASSISTANT
    is_privileged = is_dosen or is_assistant

    crit_list = []
    for cr in rubric.criteria:
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
        crit_list.append(item)

    return {
        "id": rubric.id,
        "title": rubric.title,
        "classId": rubric.classId,
        "createdById": rubric.createdById,
        "createdAt": rubric.createdAt.isoformat() if rubric.createdAt else None,
        "criteria": crit_list,
    }


@rubrics_router.patch("/classes/{class_id}/rubrics/{rubric_id}")
async def update_rubric(
    class_id: str,
    rubric_id: str,
    req: UpdateRubricSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != Role.DOSEN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    rubric = (
        db.query(Rubric)
        .filter(Rubric.id == rubric_id, Rubric.classId == class_id)
        .first()
    )
    if not rubric or rubric.class_.dosenId != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rubrik tidak ditemukan")

    if req.title is not None:
        rubric.title = req.title

    if req.criteria is not None:
        # Replace criteria
        db.query(RubricCriterion).filter(RubricCriterion.rubricId == rubric_id).delete()
        for cr in req.criteria:
            ak_emb = None
            mat_emb = None
            if cr.answerKey and cr.answerKey.strip():
                ak_emb = await generate_embedding(cr.answerKey)
            if cr.material and cr.material.strip():
                mat_emb = await generate_embedding(cr.material)

            crit = RubricCriterion(
                rubricId=rubric.id,
                label=cr.label,
                description=cr.description,
                maxScore=cr.maxScore,
                weight=cr.weight,
                expectedAnswer=cr.expectedAnswer,
                answerKey=cr.answerKey,
                material=cr.material,
                answerKeyEmbedding=ak_emb,
                materialEmbedding=mat_emb,
            )
            db.add(crit)

    db.commit()
    db.refresh(rubric)

    return {"success": True, "id": rubric.id, "title": rubric.title}


@rubrics_router.delete("/classes/{class_id}/rubrics/{rubric_id}")
async def delete_rubric(
    class_id: str,
    rubric_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != Role.DOSEN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    rubric = (
        db.query(Rubric)
        .filter(Rubric.id == rubric_id, Rubric.classId == class_id)
        .first()
    )
    if not rubric or rubric.class_.dosenId != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rubrik tidak ditemukan")

    db.delete(rubric)
    db.commit()

    return {"success": True}


@rubrics_router.get("/rubrics-hub")
async def get_rubrics_hub(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != Role.DOSEN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized")

    classes = (
        db.query(Class)
        .filter(Class.dosenId == current_user.id, Class.isArchived == False)
        .order_by(Class.createdAt.desc())
        .all()
    )

    result = []
    for c in classes:
        rubrics_data = []
        for r in c.rubrics:
            crit_data = [
                {
                    "id": cr.id,
                    "label": cr.label,
                    "description": cr.description,
                    "maxScore": cr.maxScore,
                    "weight": cr.weight,
                    "rubricId": cr.rubricId,
                }
                for cr in r.criteria
            ]
            rubrics_data.append({
                "id": r.id,
                "title": r.title,
                "classId": r.classId,
                "createdById": r.createdById,
                "createdAt": r.createdAt.isoformat() if r.createdAt else None,
                "criteria": crit_data,
                "_count": {"assignments": len(r.assignments)},
            })

        result.append({
            "id": c.id,
            "name": c.name,
            "subject": c.subject,
            "rubrics": rubrics_data,
        })

    return result
