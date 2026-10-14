from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import User, DocumentVersion, Class, Enrollment
from app.models.enums import Role, ClassRole, DocumentStatus
from app.security.dependencies import get_current_user
from app.services.storage_service import storage

documents_router = APIRouter(prefix="/document-versions", tags=["documents"])


@documents_router.get("/{version_id}")
async def get_document_version(
    version_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    version = db.query(DocumentVersion).filter(DocumentVersion.id == version_id).first()
    if not version:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    cls = version.document.assignment.class_
    is_dosen = cls.dosenId == current_user.id
    enrollment = (
        db.query(Enrollment)
        .filter(Enrollment.classId == cls.id, Enrollment.mahasiswaId == current_user.id)
        .first()
    )
    is_assistant = enrollment and enrollment.role == ClassRole.ASSISTANT

    if not is_dosen and not is_assistant:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    return {
        "id": version.id,
        "versionNumber": version.versionNumber,
        "mimeType": version.mimeType,
        "extractionStatus": version.extractionStatus.value if hasattr(version.extractionStatus, "value") else str(version.extractionStatus),
        "errorMessage": version.errorMessage,
        "chunks": [
            {
                "id": c.id,
                "chunkIndex": c.chunkIndex,
                "tokenEstimate": c.tokenEstimate,
                "rawText": c.rawText,
                "locator": c.locator,
            }
            for c in version.chunks
        ],
    }


@documents_router.get("/{version_id}/download")
async def download_document_version(
    version_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    version = db.query(DocumentVersion).filter(DocumentVersion.id == version_id).first()
    if not version:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    cls = version.document.assignment.class_
    is_dosen = cls.dosenId == current_user.id
    enrollment = (
        db.query(Enrollment)
        .filter(Enrollment.classId == cls.id, Enrollment.mahasiswaId == current_user.id)
        .first()
    )
    is_assistant = enrollment and enrollment.role == ClassRole.ASSISTANT

    if not is_dosen and not is_assistant:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    file_bytes = storage.get_sync(version.objectKey)

    return Response(
        content=file_bytes,
        media_type=version.mimeType,
        headers={"Content-Disposition": f'attachment; filename="{version.originalName or version.objectKey}"'},
    )


@documents_router.post("/{version_id}/approve")
async def approve_document_version(
    version_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != Role.DOSEN:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")

    version = db.query(DocumentVersion).filter(DocumentVersion.id == version_id).first()
    if not version:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    cls = version.document.assignment.class_
    if cls.dosenId != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    if version.extractionStatus != DocumentStatus.REVIEW_REQUIRED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot approve document in status: {version.extractionStatus.value}",
        )

    version.extractionStatus = DocumentStatus.APPROVED
    version.approvedById = current_user.id
    version.approvedAt = datetime.now()
    db.commit()

    return {"success": True, "status": "APPROVED", "indexingPending": True}
