"""baseline_schema

Revision ID: 8ccc2844ad01
Revises: 
Create Date: 2026-10-15 16:23:49.787420

Self-contained reproducible canonical schema migration.
Does NOT import or depend on application ORM models.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

# revision identifiers, used by Alembic.
revision: str = '8ccc2844ad01'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    is_postgres = bind.dialect.name == "postgresql"

    # Always ensure pgvector extension exists on PostgreSQL
    if is_postgres:
        op.execute("CREATE EXTENSION IF NOT EXISTS vector;")

    if "users" in existing_tables:
        # PATH A: Existing Database Adoption
        # Schema already present (e.g. via Prisma or earlier migration).
        # We preserve existing tables, data, _prisma_migrations, and indexes without destructive drops.
        print("Alembic baseline: existing schema detected. Adopting baseline without destructive alterations.")
        return

    # PATH B: Fresh Empty Database Provisioning
    # Self-contained reproducible DDL without importing changing application models.
    print("Alembic baseline: empty database detected. Building complete schema from canonical DDL...")

    if is_postgres:
        # 1. Create Enums
        op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role') THEN
                CREATE TYPE "Role" AS ENUM ('DOSEN', 'MAHASISWA');
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClassRole') THEN
                CREATE TYPE "ClassRole" AS ENUM ('STUDENT', 'ASSISTANT');
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SubmissionType') THEN
                CREATE TYPE "SubmissionType" AS ENUM ('TEXT', 'PDF', 'DOCX', 'ANY');
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AssignmentStatus') THEN
                CREATE TYPE "AssignmentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED');
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SubmissionStatus') THEN
                CREATE TYPE "SubmissionStatus" AS ENUM ('SUBMITTED', 'AI_PROCESSING', 'AI_REVIEWED', 'GRADED');
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SourceType') THEN
                CREATE TYPE "SourceType" AS ENUM ('ANSWER_KEY', 'MATERIAL');
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'JobStatus') THEN
                CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCEL_REQUESTED', 'CANCELLED');
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'JobType') THEN
                CREATE TYPE "JobType" AS ENUM ('DOCUMENT_EXTRACT', 'DOCUMENT_INDEX', 'EVALUATION');
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DocumentStatus') THEN
                CREATE TYPE "DocumentStatus" AS ENUM ('UPLOADING', 'UPLOADED', 'EXTRACTING', 'REVIEW_REQUIRED', 'APPROVED', 'INDEXING', 'READY', 'FAILED', 'RETIRED');
            END IF;
        END $$;
        """)

        # 2. Create All 19 Canonical Tables and Core Constraints
        op.execute("""
        CREATE TABLE IF NOT EXISTS "users" (
            "id" TEXT NOT NULL,
            "name" TEXT NOT NULL,
            "email" TEXT NOT NULL,
            "passwordHash" TEXT NOT NULL,
            "role" "Role" NOT NULL,
            "avatarUrl" TEXT,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "users_pkey" PRIMARY KEY ("id")
        );
        CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");

        CREATE TABLE IF NOT EXISTS "classes" (
            "id" TEXT NOT NULL,
            "name" TEXT NOT NULL,
            "description" TEXT,
            "subject" TEXT,
            "enrollmentKey" TEXT NOT NULL,
            "isArchived" BOOLEAN NOT NULL DEFAULT false,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "dosenId" TEXT NOT NULL,
            CONSTRAINT "classes_pkey" PRIMARY KEY ("id"),
            CONSTRAINT "classes_dosenId_fkey" FOREIGN KEY ("dosenId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
        CREATE UNIQUE INDEX IF NOT EXISTS "classes_enrollmentKey_key" ON "classes"("enrollmentKey");

        CREATE TABLE IF NOT EXISTS "enrollments" (
            "id" TEXT NOT NULL,
            "role" "ClassRole" NOT NULL DEFAULT 'STUDENT',
            "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "classId" TEXT NOT NULL,
            "mahasiswaId" TEXT NOT NULL,
            CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id"),
            CONSTRAINT "enrollments_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT "enrollments_mahasiswaId_fkey" FOREIGN KEY ("mahasiswaId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT "enrollments_classId_mahasiswaId_key" UNIQUE ("classId", "mahasiswaId")
        );

        CREATE TABLE IF NOT EXISTS "rubrics" (
            "id" TEXT NOT NULL,
            "title" TEXT NOT NULL,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "classId" TEXT NOT NULL,
            "createdById" TEXT NOT NULL,
            CONSTRAINT "rubrics_pkey" PRIMARY KEY ("id"),
            CONSTRAINT "rubrics_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT "rubrics_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
        );

        CREATE TABLE IF NOT EXISTS "rubric_criteria" (
            "id" TEXT NOT NULL,
            "label" TEXT NOT NULL,
            "description" TEXT,
            "maxScore" DOUBLE PRECISION NOT NULL,
            "weight" DOUBLE PRECISION NOT NULL,
            "expectedAnswer" TEXT,
            "answerKey" TEXT,
            "material" TEXT,
            "answerKeyEmbedding" JSONB,
            "materialEmbedding" JSONB,
            "rubricId" TEXT NOT NULL,
            CONSTRAINT "rubric_criteria_pkey" PRIMARY KEY ("id"),
            CONSTRAINT "rubric_criteria_rubricId_fkey" FOREIGN KEY ("rubricId") REFERENCES "rubrics"("id") ON DELETE CASCADE ON UPDATE CASCADE
        );

        CREATE TABLE IF NOT EXISTS "assignments" (
            "id" TEXT NOT NULL,
            "title" TEXT NOT NULL,
            "instructions" TEXT NOT NULL,
            "submissionType" "SubmissionType" NOT NULL DEFAULT 'ANY',
            "dueDate" TIMESTAMP(3) NOT NULL,
            "maxScore" DOUBLE PRECISION NOT NULL DEFAULT 100,
            "allowLateSubmission" BOOLEAN NOT NULL DEFAULT false,
            "status" "AssignmentStatus" NOT NULL DEFAULT 'DRAFT',
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "classId" TEXT NOT NULL,
            "rubricId" TEXT,
            CONSTRAINT "assignments_pkey" PRIMARY KEY ("id"),
            CONSTRAINT "assignments_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT "assignments_rubricId_fkey" FOREIGN KEY ("rubricId") REFERENCES "rubrics"("id") ON DELETE SET NULL ON UPDATE CASCADE
        );

        CREATE TABLE IF NOT EXISTS "submissions" (
            "id" TEXT NOT NULL,
            "assignmentId" TEXT NOT NULL,
            "mahasiswaId" TEXT NOT NULL,
            "activeVersionId" TEXT,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "releasedGradeId" TEXT,
            CONSTRAINT "submissions_pkey" PRIMARY KEY ("id"),
            CONSTRAINT "submissions_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT "submissions_mahasiswaId_fkey" FOREIGN KEY ("mahasiswaId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT "submissions_assignmentId_mahasiswaId_key" UNIQUE ("assignmentId", "mahasiswaId")
        );

        CREATE TABLE IF NOT EXISTS "submission_versions" (
            "id" TEXT NOT NULL,
            "submissionId" TEXT NOT NULL,
            "versionNumber" INTEGER NOT NULL,
            "type" "SubmissionType" NOT NULL,
            "content" TEXT,
            "fileUrl" TEXT,
            "fileName" TEXT,
            "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "submission_versions_pkey" PRIMARY KEY ("id"),
            CONSTRAINT "submission_versions_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT "submission_versions_submissionId_versionNumber_key" UNIQUE ("submissionId", "versionNumber")
        );

        CREATE TABLE IF NOT EXISTS "evaluation_runs" (
            "id" TEXT NOT NULL,
            "submissionId" TEXT NOT NULL,
            "versionId" TEXT NOT NULL,
            "rubricVersionSnapshot" JSONB,
            "rawModelOutput" JSONB NOT NULL,
            "perCriterionScore" JSONB NOT NULL,
            "suggestedTotalScore" DOUBLE PRECISION,
            "suggestedFeedback" TEXT NOT NULL,
            "tokenUsage" JSONB,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "status" TEXT NOT NULL DEFAULT 'COMPLETED',
            "idempotencyKey" TEXT,
            "evaluatorConfig" JSONB,
            "evidence" JSONB,
            "jobId" TEXT,
            "referenceSetVersionId" TEXT,
            CONSTRAINT "evaluation_runs_pkey" PRIMARY KEY ("id"),
            CONSTRAINT "evaluation_runs_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT "evaluation_runs_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "submission_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT "evaluation_runs_idempotencyKey_key" UNIQUE ("idempotencyKey"),
            CONSTRAINT "evaluation_runs_jobId_key" UNIQUE ("jobId")
        );
        CREATE INDEX IF NOT EXISTS "evaluation_runs_versionId_createdAt_idx" ON "evaluation_runs"("versionId", "createdAt");

        CREATE TABLE IF NOT EXISTS "grade_revisions" (
            "id" TEXT NOT NULL,
            "submissionId" TEXT NOT NULL,
            "versionId" TEXT,
            "status" TEXT NOT NULL DEFAULT 'DRAFT',
            "finalScore" DOUBLE PRECISION NOT NULL,
            "finalFeedback" TEXT NOT NULL,
            "isAIAssisted" BOOLEAN NOT NULL DEFAULT false,
            "editedFromAI" BOOLEAN NOT NULL DEFAULT false,
            "gradedById" TEXT NOT NULL,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "changeReason" TEXT,
            "legacyProvenance" TEXT,
            CONSTRAINT "grade_revisions_pkey" PRIMARY KEY ("id"),
            CONSTRAINT "grade_revisions_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT "grade_revisions_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "submission_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE,
            CONSTRAINT "grade_revisions_gradedById_fkey" FOREIGN KEY ("gradedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
        );

        CREATE TABLE IF NOT EXISTS "documents" (
            "id" TEXT NOT NULL,
            "assignmentId" TEXT NOT NULL,
            "ownerId" TEXT NOT NULL,
            "sourceType" "SourceType" NOT NULL,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "documents_pkey" PRIMARY KEY ("id"),
            CONSTRAINT "documents_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT "documents_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
        );

        CREATE TABLE IF NOT EXISTS "document_versions" (
            "id" TEXT NOT NULL,
            "documentId" TEXT NOT NULL,
            "versionNumber" INTEGER NOT NULL,
            "objectKey" TEXT NOT NULL,
            "mimeType" TEXT NOT NULL,
            "checksum" TEXT NOT NULL,
            "size" INTEGER NOT NULL,
            "extractionStatus" "DocumentStatus" NOT NULL DEFAULT 'UPLOADED',
            "errorMessage" TEXT,
            "approvedById" TEXT,
            "approvedAt" TIMESTAMP(3),
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "activeIndexGeneration" TEXT,
            "extractionMethod" TEXT,
            "indexedAt" TIMESTAMP(3),
            "originalName" TEXT,
            "pageCount" INTEGER,
            "parserVersion" TEXT,
            "qualityFlags" JSONB,
            CONSTRAINT "document_versions_pkey" PRIMARY KEY ("id"),
            CONSTRAINT "document_versions_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT "document_versions_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
            CONSTRAINT "document_versions_documentId_versionNumber_key" UNIQUE ("documentId", "versionNumber")
        );

        CREATE TABLE IF NOT EXISTS "document_chunks" (
            "id" TEXT NOT NULL,
            "documentVersionId" TEXT NOT NULL,
            "rawText" TEXT NOT NULL,
            "normalizedText" TEXT,
            "locator" JSONB NOT NULL,
            "heading" TEXT,
            "language" TEXT,
            "flags" JSONB,
            "checksum" TEXT NOT NULL,
            "chunkIndex" INTEGER NOT NULL DEFAULT 0,
            "tokenEstimate" INTEGER NOT NULL DEFAULT 0,
            CONSTRAINT "document_chunks_pkey" PRIMARY KEY ("id"),
            CONSTRAINT "document_chunks_documentVersionId_fkey" FOREIGN KEY ("documentVersionId") REFERENCES "document_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
        CREATE INDEX IF NOT EXISTS "document_chunks_documentVersionId_chunkIndex_idx" ON "document_chunks"("documentVersionId", "chunkIndex");

        CREATE TABLE IF NOT EXISTS "chunk_embeddings" (
            "id" TEXT NOT NULL,
            "chunkId" TEXT NOT NULL,
            "indexGeneration" TEXT NOT NULL,
            "model" TEXT NOT NULL,
            "dimension" INTEGER NOT NULL,
            "state" TEXT NOT NULL DEFAULT 'READY',
            "assignmentId" TEXT NOT NULL,
            "checksum" TEXT NOT NULL,
            "classId" TEXT NOT NULL,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "documentVersionId" TEXT NOT NULL,
            "embedding" vector(768),
            "parserVersion" TEXT,
            "sourceType" "SourceType" NOT NULL,
            CONSTRAINT "chunk_embeddings_pkey" PRIMARY KEY ("id"),
            CONSTRAINT "chunk_embeddings_chunkId_fkey" FOREIGN KEY ("chunkId") REFERENCES "document_chunks"("id") ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT "chunk_embeddings_chunkId_indexGeneration_model_key" UNIQUE ("chunkId", "indexGeneration", "model")
        );
        CREATE INDEX IF NOT EXISTS "chunk_embeddings_assignmentId_indexGeneration_model_idx" ON "chunk_embeddings"("assignmentId", "indexGeneration", "model");
        CREATE INDEX IF NOT EXISTS "chunk_embeddings_documentVersionId_indexGeneration_idx" ON "chunk_embeddings"("documentVersionId", "indexGeneration");

        CREATE TABLE IF NOT EXISTS "reference_set_versions" (
            "id" TEXT NOT NULL,
            "assignmentId" TEXT NOT NULL,
            "versionNumber" INTEGER NOT NULL,
            "mapping" JSONB,
            "visibility" TEXT NOT NULL DEFAULT 'PRIVATE',
            "indexGeneration" TEXT,
            "manifestHash" TEXT,
            "approvedById" TEXT,
            "approvedAt" TIMESTAMP(3),
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "reference_set_versions_pkey" PRIMARY KEY ("id"),
            CONSTRAINT "reference_set_versions_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT "reference_set_versions_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
            CONSTRAINT "reference_set_versions_assignmentId_versionNumber_key" UNIQUE ("assignmentId", "versionNumber")
        );

        CREATE TABLE IF NOT EXISTS "reference_set_documents" (
            "referenceSetId" TEXT NOT NULL,
            "documentVersionId" TEXT NOT NULL,
            CONSTRAINT "reference_set_documents_pkey" PRIMARY KEY ("referenceSetId", "documentVersionId"),
            CONSTRAINT "reference_set_documents_referenceSetId_fkey" FOREIGN KEY ("referenceSetId") REFERENCES "reference_set_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT "reference_set_documents_documentVersionId_fkey" FOREIGN KEY ("documentVersionId") REFERENCES "document_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE
        );

        CREATE TABLE IF NOT EXISTS "evaluator_config_versions" (
            "id" TEXT NOT NULL,
            "versionNumber" INTEGER NOT NULL,
            "provider" TEXT NOT NULL,
            "model" TEXT NOT NULL,
            "promptVersion" TEXT NOT NULL,
            "parameters" JSONB NOT NULL,
            "retrievalConfig" JSONB NOT NULL,
            "parserVersion" TEXT,
            "indexVersion" TEXT,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "evaluator_config_versions_pkey" PRIMARY KEY ("id")
        );

        CREATE TABLE IF NOT EXISTS "embedding_cache" (
            "id" TEXT NOT NULL,
            "scopeKey" TEXT NOT NULL,
            "checksum" TEXT NOT NULL,
            "model" TEXT NOT NULL,
            "dimension" INTEGER NOT NULL,
            "vectors" JSONB NOT NULL,
            "hits" INTEGER NOT NULL DEFAULT 0,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "embedding_cache_pkey" PRIMARY KEY ("id"),
            CONSTRAINT "embedding_cache_scopeKey_checksum_model_dimension_key" UNIQUE ("scopeKey", "checksum", "model", "dimension")
        );

        CREATE TABLE IF NOT EXISTS "jobs" (
            "id" TEXT NOT NULL,
            "type" "JobType" NOT NULL,
            "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
            "idempotencyKey" TEXT NOT NULL,
            "correlationId" TEXT NOT NULL,
            "userId" TEXT NOT NULL,
            "classId" TEXT,
            "payload" JSONB NOT NULL,
            "progress" JSONB,
            "result" JSONB,
            "errorCode" TEXT,
            "errorMessage" TEXT,
            "attempts" INTEGER NOT NULL DEFAULT 0,
            "maxAttempts" INTEGER NOT NULL DEFAULT 3,
            "runAfter" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "leaseOwner" TEXT,
            "leaseExpiresAt" TIMESTAMP(3),
            "heartbeatAt" TIMESTAMP(3),
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "startedAt" TIMESTAMP(3),
            "finishedAt" TIMESTAMP(3),
            CONSTRAINT "jobs_pkey" PRIMARY KEY ("id"),
            CONSTRAINT "jobs_idempotencyKey_key" UNIQUE ("idempotencyKey")
        );
        CREATE INDEX IF NOT EXISTS "jobs_status_runAfter_idx" ON "jobs"("status", "runAfter");
        CREATE INDEX IF NOT EXISTS "jobs_userId_status_idx" ON "jobs"("userId", "status");
        CREATE INDEX IF NOT EXISTS "jobs_classId_status_idx" ON "jobs"("classId", "status");
        """)


def downgrade() -> None:
    pass
