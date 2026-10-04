-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCEL_REQUESTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('DOCUMENT_EXTRACT', 'DOCUMENT_INDEX', 'EVALUATION');

-- AlterTable
ALTER TABLE "evaluation_runs" ADD COLUMN     "evaluatorConfig" JSONB,
ADD COLUMN     "evidence" JSONB,
ADD COLUMN     "jobId" TEXT,
ADD COLUMN     "referenceSetVersionId" TEXT,
ALTER COLUMN "suggestedTotalScore" DROP NOT NULL;

-- AlterTable
ALTER TABLE "document_versions" ADD COLUMN     "activeIndexGeneration" TEXT,
ADD COLUMN     "extractionMethod" TEXT,
ADD COLUMN     "indexedAt" TIMESTAMP(3),
ADD COLUMN     "originalName" TEXT,
ADD COLUMN     "pageCount" INTEGER,
ADD COLUMN     "parserVersion" TEXT,
ADD COLUMN     "qualityFlags" JSONB;

-- AlterTable
ALTER TABLE "document_chunks" ADD COLUMN     "chunkIndex" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tokenEstimate" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "chunk_embeddings" DROP COLUMN "vector",
ADD COLUMN     "assignmentId" TEXT NOT NULL,
ADD COLUMN     "checksum" TEXT NOT NULL,
ADD COLUMN     "classId" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "documentVersionId" TEXT NOT NULL,
ADD COLUMN     "embedding" vector(768),
ADD COLUMN     "parserVersion" TEXT,
ADD COLUMN     "sourceType" "SourceType" NOT NULL;

-- CreateTable
CREATE TABLE "embedding_cache" (
    "id" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "dimension" INTEGER NOT NULL,
    "vectors" JSONB NOT NULL,
    "hits" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "embedding_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
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

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "embedding_cache_scopeKey_checksum_model_dimension_key" ON "embedding_cache"("scopeKey", "checksum", "model", "dimension");

-- CreateIndex
CREATE UNIQUE INDEX "jobs_idempotencyKey_key" ON "jobs"("idempotencyKey");

-- CreateIndex
CREATE INDEX "jobs_status_runAfter_idx" ON "jobs"("status", "runAfter");

-- CreateIndex
CREATE INDEX "jobs_userId_status_idx" ON "jobs"("userId", "status");

-- CreateIndex
CREATE INDEX "jobs_classId_status_idx" ON "jobs"("classId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "evaluation_runs_jobId_key" ON "evaluation_runs"("jobId");

-- CreateIndex
CREATE INDEX "evaluation_runs_versionId_createdAt_idx" ON "evaluation_runs"("versionId", "createdAt");

-- CreateIndex
CREATE INDEX "document_chunks_documentVersionId_chunkIndex_idx" ON "document_chunks"("documentVersionId", "chunkIndex");

-- CreateIndex
CREATE INDEX "chunk_embeddings_assignmentId_indexGeneration_model_idx" ON "chunk_embeddings"("assignmentId", "indexGeneration", "model");

-- CreateIndex
CREATE INDEX "chunk_embeddings_documentVersionId_indexGeneration_idx" ON "chunk_embeddings"("documentVersionId", "indexGeneration");

-- CreateIndex
CREATE UNIQUE INDEX "chunk_embeddings_chunkId_indexGeneration_model_key" ON "chunk_embeddings"("chunkId", "indexGeneration", "model");
