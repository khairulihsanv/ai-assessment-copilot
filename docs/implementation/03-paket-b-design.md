# Desain Historis dan Migrasi Paket B (Versi & Penilaian)

Dokumen ini merancang ulang arsitektur riwayat submisi dan evaluasi (Paket B) sesuai PRD 02 agar bersifat *immutable*, *append-only*, dan mendukung resolusi nilai eksplisit tanpa risiko kehilangan data historis (overwrite).

## 1. Desain Skema (Sebelum vs Sesudah)

### Sebelum (Legacy 1:1 In-Place)
```prisma
model Submission {
  id String @id @default(cuid())
  content String?
  aiEvaluation AIEvaluation? // 1:1, tertimpa
  grade Grade?               // 1:1, tertimpa
  @@unique([assignmentId, userId]) // Membatasi mahasiswa hanya punya 1 submisi!
}
```

### Sesudah (Append-Only dengan Versi Eksplisit)
```prisma
model Submission {
  id           String   @id @default(cuid())
  assignmentId String
  userId       String   @map("mahasiswaId")
  createdAt    DateTime @default(now())

  // Pointer ke status dan nilai aktif (Dirilis ke mahasiswa)
  activeVersionId      String?
  releasedGradeId      String?

  versions       SubmissionVersion[]
  evaluations    EvaluationRun[]
  grades         GradeRevision[]

  @@unique([assignmentId, userId])
  @@map("submissions")
}

model SubmissionVersion {
  id           String   @id @default(cuid())
  submissionId String
  submission   Submission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  
  versionNumber Int      // 1, 2, 3...
  type          SubmissionType
  content       String?
  fileUrl       String?
  fileName      String?
  submittedAt   DateTime @default(now())

  evaluations   EvaluationRun[]
  grades        GradeRevision[]

  @@unique([submissionId, versionNumber])
  @@map("submission_versions")
}

model EvaluationRun {
  id                  String   @id @default(cuid())
  submissionId        String
  submission          Submission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  versionId           String
  version             SubmissionVersion @relation(fields: [versionId], references: [id], onDelete: Cascade)
  
  // Provenance & Konteks saat dievaluasi
  rubricVersionSnapshot Json? // Mencatat status rubrik saat dijalankan, agar tidak terpengaruh jika rubrik diubah dosen
  
  rawModelOutput      Json 
  perCriterionScore   Json 
  suggestedTotalScore Float
  suggestedFeedback   String
  tokenUsage          Json? 
  
  createdAt           DateTime @default(now())
  status              String   @default("COMPLETED") // PENDING, COMPLETED, FAILED

  @@map("evaluation_runs")
}

model GradeRevision {
  id              String   @id @default(cuid())
  submissionId    String
  submission      Submission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  versionId       String?
  version         SubmissionVersion? @relation(fields: [versionId], references: [id], onDelete: SetNull)
  
  status          String   @default("DRAFT") // DRAFT, APPROVED, RELEASED, SUPERSEDED, WITHDRAWN
  finalScore      Float
  finalFeedback   String
  isAIAssisted    Boolean  @default(false)
  editedFromAI    Boolean  @default(false)
  
  gradedById      String
  gradedBy        User     @relation("GradedByDosen", fields: [gradedById], references: [id], onDelete: Cascade)
  createdAt       DateTime @default(now())
  
  // Audit log
  changeReason    String?
  legacyProvenance String? // Untuk data migrasi lama yang tidak diketahui

  @@map("grade_revisions")
}
```

## 2. Rencana Migrasi SQL dan Pemetaan Record Lama (Backfill)

Karena database produksi tidak boleh di-reset, perubahan akan dieksekusi melalui SQL terarah yang menjamin data migrasi:

```sql
-- 1. Buat Tabel Baru
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

CREATE TABLE "evaluation_runs" ( /* struktur baru */ );
CREATE TABLE "grade_revisions" ( /* struktur baru */ );

-- 2. Backfill (Pemindahan Data Legacy)
-- Setiap record di 'submissions' lama di-copy sebagai versi 1 di 'submission_versions'
INSERT INTO "submission_versions" ("id", "submissionId", "versionNumber", "type", "content", "fileUrl", "fileName", "submittedAt")
SELECT gen_random_uuid(), "id", 1, "type", "content", "fileUrl", "fileName", "submittedAt"
FROM "submissions";

-- Backfill grades dan evaluation
-- Map data lama dari 'grades' ke 'grade_revisions' dan tandai sebagai RELEASED dan SUPERSEDED berdasarkan konteks.
-- Tandai legacyProvenance sebagai 'LEGACY_UNKNOWN_SNAPSHOT'. Jangan mengarang snapshot rubrik lama.
-- Biarkan changeReason kosong untuk migrasi.

-- 3. Hapus Kolom Lama di Submissions (Setelah aman)
-- ALTER TABLE "submissions" DROP COLUMN "content", "fileUrl", dll.
```

## 3. Optimistic Concurrency dan Operasi Atomik
- **Kondisi Berlomba (Concurrency)**:
  - Perubahan/submisi ulang wajib menyertakan `expectedSubmissionVersionId` untuk memastikan versi tidak berubah saat diproses.
  - Penilaian manual/AI wajib menyertakan `expectedGradeRevisionId` atau *rowVersion* untuk mendeteksi konflik edit nilai pada versi jawaban yang sama.
  - Semua pemeriksaan versi dan penulisan (INSERT versi baru & pemindahan *active pointer*) dilakukan secara **atomik** dalam satu Prisma `$transaction`.
- **Aturan Tegas AI Rerun**: Penjalanan ulang evaluasi AI (AI Rerun) **TIDAK BOLEH** mengganti atau menerbitkan nilai dirilis (`RELEASED`), meskipun tercatat di audit log. AI hanya menghasilkan _EvaluationRun_ baru dan memicu draf. Perubahan nilai akhir mutlak harus melalui tindakan pengesahan dari dosen (DRAFT -> RELEASED).
- **Penanganan Idempotency**: Setiap _Request_ AI Grading akan dipasangi `idempotencyKey` pada tabel `evaluation_runs`. Jika _user_ mengklik tombol berkali-kali, kueri akan mengembalikan ID `evaluation_runs` yang sudah dalam status `PENDING`.

## 4. Persiapan Tes Fixture
Sebelum migrasi dieksekusi ke staging/produksi, kita akan menulis 6 skenario tes _end-to-end_ terisolasi:
1. Menambahkan submission kedua tidak merusak versi 1, dan `activeVersionId` bergeser.
2. AI Evaluation pada versi 1 tidak ikut tertaut ke versi 2.
3. Nilai berstatus `RELEASED` tidak tertimpa saat dosen menekan tombol "Grade AI" lagi (akan tercipta entri `evaluation_runs` baru, dan jika disahkan, akan menjadi `GradeRevision` baru dengan _changeReason_, serta nilai sebelumnya diubah menjadi `SUPERSEDED`).
4. Pengguna mahasiswa melakukan _fetch_ kueri dan draf dosen (_grade revision_ berstatus `DRAFT`) tidak muncul di payload (diuji di test nyata, bukan sekadar mem-mock fungsi Prisma).
