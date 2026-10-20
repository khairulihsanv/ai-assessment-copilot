import hashlib
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.enums import ClassRole, DocumentStatus, Role
from app.models.models import (
    DocumentChunk,
    DocumentVersion,
    Enrollment,
    User,
)
from app.security.dependencies import get_current_user
from app.services.chunker_service import chunk_text
from app.services.embedding_service import (
    EmbeddingError,
    generate_embedding_result,
)
from app.services.extractor_service import extract_text_from_buffer
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
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    version = db.query(DocumentVersion).filter(DocumentVersion.id == version_id).first()
    if not version:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    cls = version.document.assignment.class_
    if cls.dosenId != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    if version.extractionStatus not in (DocumentStatus.REVIEW_REQUIRED, DocumentStatus.UPLOADED, DocumentStatus.FAILED):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot approve document in status: {version.extractionStatus.value}",
        )

    # 1. Ensure chunks exist for this version; extract if not already extracted
    chunks = (
        db.query(DocumentChunk)
        .filter(DocumentChunk.documentVersionId == version.id)
        .order_by(DocumentChunk.chunkIndex)
        .all()
    )
    if not chunks:
        file_bytes = storage.get_sync(version.objectKey)
        orig_name_lower = (version.originalName or "").lower()
        if version.mimeType == "application/pdf" or orig_name_lower.endswith(".pdf"):
            ext = "PDF"
        elif "word" in version.mimeType or orig_name_lower.endswith(".docx"):
            ext = "DOCX"
        else:
            ext = "TEXT"
        text_content = extract_text_from_buffer(file_bytes, ext)
        if not text_content.strip():
            version.extractionStatus = DocumentStatus.FAILED
            version.errorMessage = "Tidak ada teks yang dapat diekstrak dari dokumen"
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Dokumen tidak memuat teks yang dapat diekstrak",
            )

        chunk_items = chunk_text(text_content, max_chunk_chars=1200, overlap_chars=150)
        chunks = []
        for c in chunk_items:
            doc_chunk = DocumentChunk(
                documentVersionId=version.id,
                chunkIndex=c["chunkIndex"],
                tokenEstimate=c["tokenEstimate"],
                rawText=c["rawText"],
                normalizedText=c["normalizedText"],
                locator=c["locator"],
                checksum=c["checksum"],
            )
            db.add(doc_chunk)
            chunks.append(doc_chunk)
        db.commit()
        for c in chunks:
            db.refresh(c)

    # 2. Generate embeddings for all chunks in-memory first to avoid partial database writes on provider failure
    embeddings_to_insert = []
    for chunk in chunks:
        try:
            emb_res = await generate_embedding_result(chunk.rawText)
            embeddings_to_insert.append((chunk, emb_res))
        except EmbeddingError as ee:
            version.extractionStatus = DocumentStatus.FAILED
            version.errorMessage = f"Gagal membuat embedding: {ee}"
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Layanan embedding gagal atau tidak tersedia: {ee}. Silakan coba lagi.",
            )
        except Exception as e:
            version.extractionStatus = DocumentStatus.FAILED
            version.errorMessage = f"Kesalahan internal saat indexing: {e}"
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Kesalahan indexing: {e}",
            )

    # 3. Clean up any existing embeddings for this version to ensure retry does not duplicate rows
    db.execute(text('DELETE FROM chunk_embeddings WHERE "documentVersionId" = :vid'), {"vid": version.id})

    # 4. Insert all valid embeddings
    for chunk, emb_res in embeddings_to_insert:
        vec = emb_res.vector
        vec_str = "[" + ",".join(str(x) for x in vec) + "]"
        chk_id = str(uuid.uuid4().hex[:25])
        chk_sum = hashlib.sha256(chunk.rawText.encode("utf-8")).hexdigest()

        insert_sql = text("""
            INSERT INTO chunk_embeddings (
                id, "chunkId", "classId", "assignmentId", "documentVersionId",
                "sourceType", "checksum", "indexGeneration", "model", "dimension",
                state, "createdAt", embedding
            ) VALUES (
                :id, :chunkId, :classId, :assignmentId, :documentVersionId,
                :sourceType, :checksum, :indexGeneration, :model, :dimension,
                :state, now(), CAST(:vec AS vector)
            )
        """)
        db.execute(insert_sql, {
            "id": chk_id,
            "chunkId": chunk.id,
            "classId": cls.id,
            "assignmentId": version.document.assignmentId,
            "documentVersionId": version.id,
            "sourceType": version.document.sourceType.value,
            "checksum": chk_sum,
            "indexGeneration": "v1",
            "model": emb_res.model,
            "dimension": emb_res.dimension,
            "state": "READY",
            "vec": vec_str,
        })

    # 5. Mark version APPROVED and clear any previous errorMessage
    version.extractionStatus = DocumentStatus.APPROVED
    version.errorMessage = None
    version.approvedById = current_user.id
    version.approvedAt = datetime.now()
    version.indexedAt = datetime.now()
    version.activeIndexGeneration = "v1"
    db.commit()

    return {
        "success": True,
        "status": "APPROVED",
        "chunksIndexed": len(chunks),
        "indexingPending": False,
    }

