from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.enums import Role
from app.models.models import DocumentStatus, ReferenceSetVersion, User
from app.security.dependencies import get_current_user

reference_sets_router = APIRouter(prefix="/reference-sets", tags=["reference-sets"])


@reference_sets_router.post("/{ref_set_id}/approve")
async def approve_reference_set(
    ref_set_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != Role.DOSEN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    ref_set = (
        db.query(ReferenceSetVersion)
        .filter(ReferenceSetVersion.id == ref_set_id)
        .first()
    )
    if not ref_set:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    cls = ref_set.assignment.class_
    if cls.dosenId != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    if not ref_set.documents:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Set acuan harus memiliki dokumen")

    # Check if documents are ready or approved
    not_ready = [
        d.document_version.id
        for d in ref_set.documents
        if d.document_version.extractionStatus not in (DocumentStatus.READY, DocumentStatus.APPROVED)
    ]
    if not_ready:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot approve Reference Set because some documents are not ready: {not_ready}",
        )

    ref_set.approvedById = current_user.id
    ref_set.approvedAt = datetime.now()
    db.commit()

    return {"success": True, "id": ref_set.id, "approvedAt": ref_set.approvedAt.isoformat()}
