-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('ANSWER_KEY', 'MATERIAL');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('UPLOADING', 'UPLOADED', 'EXTRACTING', 'REVIEW_REQUIRED', 'APPROVED', 'INDEXING', 'READY', 'FAILED', 'RETIRED');

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "sourceType" "SourceType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_versions" (
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

    CONSTRAINT "document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_chunks" (
    "id" TEXT NOT NULL,
    "documentVersionId" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "normalizedText" TEXT,
    "locator" JSONB NOT NULL,
    "heading" TEXT,
    "language" TEXT,
    "flags" JSONB,
    "checksum" TEXT NOT NULL,

    CONSTRAINT "document_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chunk_embeddings" (
    "id" TEXT NOT NULL,
    "chunkId" TEXT NOT NULL,
    "indexGeneration" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "dimension" INTEGER NOT NULL,
    "vector" JSONB NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'READY',

    CONSTRAINT "chunk_embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reference_set_versions" (
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

    CONSTRAINT "reference_set_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reference_set_documents" (
    "referenceSetId" TEXT NOT NULL,
    "documentVersionId" TEXT NOT NULL,

    CONSTRAINT "reference_set_documents_pkey" PRIMARY KEY ("referenceSetId","documentVersionId")
);

-- CreateTable
CREATE TABLE "evaluator_config_versions" (
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

-- CreateIndex
CREATE UNIQUE INDEX "document_versions_documentId_versionNumber_key" ON "document_versions"("documentId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "reference_set_versions_assignmentId_versionNumber_key" ON "reference_set_versions"("assignmentId", "versionNumber");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_documentVersionId_fkey" FOREIGN KEY ("documentVersionId") REFERENCES "document_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chunk_embeddings" ADD CONSTRAINT "chunk_embeddings_chunkId_fkey" FOREIGN KEY ("chunkId") REFERENCES "document_chunks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reference_set_versions" ADD CONSTRAINT "reference_set_versions_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reference_set_versions" ADD CONSTRAINT "reference_set_versions_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reference_set_documents" ADD CONSTRAINT "reference_set_documents_referenceSetId_fkey" FOREIGN KEY ("referenceSetId") REFERENCES "reference_set_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reference_set_documents" ADD CONSTRAINT "reference_set_documents_documentVersionId_fkey" FOREIGN KEY ("documentVersionId") REFERENCES "document_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
