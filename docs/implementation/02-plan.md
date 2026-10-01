# Rencana Implementasi Dexa Assessment

## Ringkasan Pendekatan
Implementasi akan dibagi menjadi paket kerja yang berukuran manageable dan terisolasi secara fungsional (reviewable). Urutan didasarkan pada dependensi yang logis dan diselaraskan dengan tahapan pada PRD Dexa Assessment (R0: Fondasi, R1: Pilot Dokumen & RAG, R2: Kesesuaian Baseline, dan R3: Tambahan Lanjutan). 

Pendekatan implementasi: **Data & Otorisasi \u2192 Pipeline Dokumen & RAG \u2192 UX/UI Studio Penilaian \u2192 Fitur Eksternal**.

---

## Paket A: Fondasi Akses, Otorisasi, dan Payload (Fase R0)
- **Masalah Konkret**: Data submisi, tugas, dan rubrik saat ini dapat diakses secara utuh oleh pengguna tanpa otorisasi keanggotaan kelas yang ketat. `GET detail tugas` mengembalikan data lengkap. Role `ASISTEN` tidak didukung, dan Payload ke frontend rawan membocorkan `answerKeyEmbedding`.
- **Requirement Terkait**: FR13, FR14, FR18, DX16, NFR01.
- **File/Modul Utama**: 
  - `prisma/schema.prisma` (tambah role Asisten atau membership role)
  - `app/api/classes/[classId]/assignments/[assignmentId]/route.ts`
  - `app/api/classes/[classId]/rubrics/route.ts`
- **Kontrak Data**: DTO (Data Transfer Object) spesifik peran. Frontend mahasiswa tidak akan pernah menerima field privat Dosen (seperti `answerKey`, raw embedding, atau draf nilai internal). Otorisasi pada route harus memvalidasi kepemilikan kelas.
- **Migrasi/Dependensi**: Penambahan field ke database terkait permissions dan asisten. Migration database secara backward compatible.
- **Risiko**: Kerusakan tampilan/alur di UI jika klien bergantung pada data privat yang sekarang disembunyikan.
- **Tes**: `AT-FR14`, `AT-NFR01`, `AT-DX16` (memastikan lintas kelas dan payload leakage ditutup).

## Paket B: Manajemen Versi Historis dan Persistensi Evaluasi (Fase R0 & R1)
- **Masalah Konkret**: Pengunggahan submisi ulang menimpa nilai (upsert) tanpa versi. `AIEvaluation` dan `Grade` adalah 1:1, menimpa data lama. Belum ada pelacakan historis perubahan acuan dan submission.
- **Requirement Terkait**: FR2, FR6a, FR19, DX14, DX17.
- **File/Modul Utama**:
  - `prisma/schema.prisma` (entitas `SubmissionVersion`, `EvaluationRun`, `RubricVersion`, `GradeRevision`)
- **Kontrak Data**: Relasi yang menyimpan pointer aktif `activeEvaluationRunId` dan `releasedGradeRevisionId`. Data tersimpan tidak tertimpa mutasi baru (append-only style untuk histori).
- **Risiko**: Refactoring skema cukup agresif; semua relasi existing akan error jika adapter/legacy layer tidak disediakan dengan baik.
- **Tes**: `AT-FR2`, `AT-FR6a`, `AT-FR19`.

## Paket C: Pipeline Dokumen, Ekstraksi OCR, dan RAG (Fase R1)
- **Masalah Konkret**: Pustaka dokumen sumber/acuan belum dikelola secara persisten. Ekstraksi dokumen (TXT/DOC/PDF) belum menggunakan mekanisme chunking yang mempertahankan konteks struktural (locator/halaman), dan RAG belum menggunakan index metadata yang difilter berdasar kelas.
- **Requirement Terkait**: DX01-DX10, DX21.
- **File/Modul Utama**:
  - `lib/storage/*` (abstraksi file upload).
  - Worker/parser ekstraksi OCR.
  - Implementasi chunking dan vector index (pgvector atau serupa).
- **Risiko**: Kapasitas upload dan memory bounds saat parsing. Membutuhkan setup PgVector dan penanganan error timeout.
- **Tes**: `AT-DX01` s/d `AT-DX10`.

## Paket D: Evaluasi LLM Berbukti dan Penanganan Kegagalan (Fase R1 & R2)
- **Masalah Konkret**: Pipeline SSE tidak meneruskan streaming yang bisa dibatalkan secara bersih. Nilai default fallback LLM = 0 yang merusak total skor jika failure. Retrieval tidak dibatasi hak akses kelas secara nyata sebelum menyusun prompt konteks.
- **Requirement Terkait**: FR5, FR8, FR9, DX11-DX15, DX22.
- **File/Modul Utama**:
  - Worker grading AI LLM.
  - Integrasi pembatalan AbortController di server SSE.
- **Risiko**: Biaya token dan rate-limiting AI. Kegagalan parser dari output JSON yang dihasilkan LLM.
- **Tes**: `AT-FR5`, `AT-FR9`, `AT-DX12`, `AT-DX13`.

## Paket E: Studio Koreksi, UX, dan Rilis Nilai (Fase R2)
- **Masalah Konkret**: Belum ada "Studio Koreksi" yang menampilkan 3 panel utuh (Jawaban, Bukti Acuan, Penilaian) secara berdampingan. Status Draf vs Rilis masih kabur. Angka agregat di Dashboard masih sekadar simulasi dummy.
- **Requirement Terkait**: FR22, DX18, UI01-UI22.
- **File/Modul Utama**:
  - `app/(dashboard)/...` (Re-implementasi Layout Studio sesuai `03-spesifikasi-ui-ux.md`).
- **Risiko**: Responsivitas halaman di layar mobile (akan memakai tab system alih-alih 3 panel horizontal).
- **Tes**: `AT-FR22`, `AT-DX18`.

## Paket F: Kelengkapan Ekspor, Batch, dan Laporan (Fase R2 & R3)
- **Masalah Konkret**: Ekspor CSV hanyalah alert simulasi. Belum ada dukungan penilaian Batch massal yang aman (idempotent, cancelable) dan PWA.
- **Requirement Terkait**: FR3, FR7b, FR20, FR21, FR23, FR24, EXT01-EXT13.
- **File/Modul Utama**:
  - API Report / Export Job worker.
  - Setup Service Worker `next-pwa` atau manifest.
- **Tes**: Lulus keseluruhan requirement PRD (Fase akhir).

---

## Paket Rekomendasi Pertama: Paket A
Saya merekomendasikan untuk **memulai eksekusi kode di Paket A** setelah mendapat instruksi pengguna.

**Keputusan yang membutuhkan masukan Anda (User):**
1. **Peran Asisten (RBAC vs Prisma Enum)**: 
   Sesuai izin kelas (FR14), seseorang bisa menjadi dosen di Kelas A dan asisten di Kelas B. Apakah diizinkan jika hak akses ini dikelola sebagai relasi di tabel `ClassMembership`/`Enrollment`, bukan sebagai kolom role global `User.role`? (Rekomendasi teknis: **Gunakan ClassMembership**).
2. **Storage Provider Awal**: 
   Untuk saat ini abstraksi memakai folder `uploads/` lokal. Apakah ini dapat dipertahankan sebagai MVP, atau Anda punya S3 Bucket mock yang ingin disetel sekarang? (Rekomendasi teknis: **Pertahankan Abstraksi Lokal** untuk mempercepat R0/R1).
