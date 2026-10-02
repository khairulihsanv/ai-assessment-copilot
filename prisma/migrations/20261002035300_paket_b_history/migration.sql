-- 1. Create tables first
CREATE TABLE "submission_versions" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "type" "SubmissionType" NOT NULL,
    "content" TEXT,
    "fileUrl" TEXT,
    "fileName" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submission_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "evaluation_runs" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "rubricVersionSnapshot" JSONB,
    "rawModelOutput" JSONB NOT NULL,
    "perCriterionScore" JSONB NOT NULL,
    "suggestedTotalScore" DOUBLE PRECISION NOT NULL,
    "suggestedFeedback" TEXT NOT NULL,
    "tokenUsage" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "idempotencyKey" TEXT,

    CONSTRAINT "evaluation_runs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "grade_revisions" (
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

    CONSTRAINT "grade_revisions_pkey" PRIMARY KEY ("id")
);

-- 2. Create indices
CREATE UNIQUE INDEX "submission_versions_submissionId_versionNumber_key" ON "submission_versions"("submissionId", "versionNumber");
CREATE UNIQUE INDEX "evaluation_runs_idempotencyKey_key" ON "evaluation_runs"("idempotencyKey");

-- 3. Add Extensions for gen_random_uuid() if not exists (usually available in PG 13+)
-- 4. BACKFILL DATA (Copy old data to new tables)
INSERT INTO "submission_versions" ("id", "submissionId", "versionNumber", "type", "content", "fileUrl", "fileName", "submittedAt")
SELECT gen_random_uuid()::text, "id", 1, "type", "content", "fileUrl", "fileName", "submittedAt"
FROM "submissions";

INSERT INTO "grade_revisions" ("id", "submissionId", "versionId", "status", "finalScore", "finalFeedback", "isAIAssisted", "editedFromAI", "gradedById", "createdAt", "changeReason", "legacyProvenance")
SELECT "id", "submissionId", (SELECT "id" FROM "submission_versions" WHERE "submissionId" = "grades"."submissionId" LIMIT 1), 'RELEASED', "finalScore", "finalFeedback", "isAIAssisted", "editedFromAI", "gradedById", "gradedAt", NULL, 'LEGACY_UNKNOWN_SNAPSHOT'
FROM "grades";

INSERT INTO "evaluation_runs" ("id", "submissionId", "versionId", "rubricVersionSnapshot", "rawModelOutput", "perCriterionScore", "suggestedTotalScore", "suggestedFeedback", "tokenUsage", "createdAt", "status", "idempotencyKey")
SELECT "id", "submissionId", (SELECT "id" FROM "submission_versions" WHERE "submissionId" = "ai_evaluations"."submissionId" LIMIT 1), NULL, "rawModelOutput", "perCriterionScore", "suggestedTotalScore", "suggestedFeedback", "tokenUsage", "createdAt", 'COMPLETED', NULL
FROM "ai_evaluations";

-- 5. Drop constraints from old tables
ALTER TABLE "ai_evaluations" DROP CONSTRAINT "ai_evaluations_submissionId_fkey";
ALTER TABLE "grades" DROP CONSTRAINT "grades_submissionId_fkey";
ALTER TABLE "grades" DROP CONSTRAINT "grades_gradedById_fkey";

-- 6. Alter `submissions` table
ALTER TABLE "submissions" ADD COLUMN "activeVersionId" TEXT;
ALTER TABLE "submissions" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "submissions" ADD COLUMN "releasedGradeId" TEXT;

UPDATE "submissions" SET "activeVersionId" = (SELECT "id" FROM "submission_versions" WHERE "submissionId" = "submissions"."id" LIMIT 1);
UPDATE "submissions" SET "releasedGradeId" = (SELECT "id" FROM "grade_revisions" WHERE "submissionId" = "submissions"."id" AND "status" = 'RELEASED' LIMIT 1);

ALTER TABLE "submissions" DROP COLUMN "content",
DROP COLUMN "fileName",
DROP COLUMN "fileUrl",
DROP COLUMN "status",
DROP COLUMN "submittedAt",
DROP COLUMN "type";

-- 7. Drop old tables
DROP TABLE "ai_evaluations";
DROP TABLE "grades";

-- 8. Add Foreign Keys for new tables
ALTER TABLE "submission_versions" ADD CONSTRAINT "submission_versions_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "evaluation_runs" ADD CONSTRAINT "evaluation_runs_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "evaluation_runs" ADD CONSTRAINT "evaluation_runs_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "submission_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "grade_revisions" ADD CONSTRAINT "grade_revisions_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "grade_revisions" ADD CONSTRAINT "grade_revisions_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "submission_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "grade_revisions" ADD CONSTRAINT "grade_revisions_gradedById_fkey" FOREIGN KEY ("gradedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
