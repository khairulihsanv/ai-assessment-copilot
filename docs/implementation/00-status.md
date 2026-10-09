# Status Implementasi Dexa Assessment

> Pembaruan 2 Oktober 2026: bagian kondisi awal di bawah adalah snapshot historis. Branch kerja saat audit langsung adalah `feat/paket-a-auth` (HEAD `575c84a`) dengan perubahan Paket A/B/C yang belum di-commit. Bukti verifikasi terbaru: 31 tes unit/parser, 12 tes integrasi PostgreSQL 15, build, dan pemeriksaan kesesuaian migrasi/schema lulus secara lokal. Lihat [laporan perbaikan](04-codex-fixes-2026-10-02.md) untuk cakupan dan pekerjaan yang belum selesai.

## 1. Kondisi Awal dan Snapshot
- **Branch Aktif**: `master`
- **Commit Terakhir**: `80b30a7 feat: add PDF/DOCX file upload to extract text for rubric criteria`
- **Status Git**: Terdapat file baru di folder `docs/` (`?? docs/`). Tidak ada perubahan pada file source code yang terpantau.
- **Snapshot Kesesuaian**: Snapshot kode cocok dengan temuan di laporan analisis `docs/01-analisis-kesesuaian-dexa-assessment.md` (commit `80b30a74d6cf4d93f4257b06b1971e033e9d7b80`).

## 2. Asumsi dan Keterbatasan
- File dokumen requirement (`01_Analisis_Kesesuaian_Dexa_Assessment`, `02_PRD_Dexa_Assessment`, `03_Spesifikasi_UI_UX_Dexa_Assessment`, `04_Panduan_Agent_Antigravity_Dexa_Assessment.md`) tersedia dan dibaca sebagai bahan requirement spesifikasi target yang sah, meski dokumen referensi berupa laporan Word asli tidak ada di folder proyek (PRD 02 yang akan dijadikan landasan utama sesuai instruksi).
- Database menggunakan PostgreSQL dengan Prisma v6.4 (berdasarkan `schema.prisma` dan `package.json`). Kompatibilitas untuk pgvector perlu diuji bila kita mulai mengerjakan RAG di Fase R1.
- Pengelolaan environment LLM & Embedding belum menggunakan credential/skema yang siap production; pengembangan pada pipeline awal membutuhkan dummy/mock atau env rahasia milik pengguna lokal, dan error API dari AI tidak boleh menjadikan skor nol akademik, melainkan status abstain/gagal.
- Direktori `scratch/` akan diabaikan dari komitmen produksi (bersifat lokal IDE).

## 3. Konflik dan Keputusan
- **Konflik Spesifikasi Lama/Baru**: Desain antarmuka UI/UX pada branch `master` mengacu pada `DESIGN.md` yang menggunakan gaya hero besar, dekorasi glow 3D, dan metrik hasil simulasi AI (klaim "0% halusinasi"). PRD baru menuntut antarmuka kerja bersih (ruang besar untuk pekerjaan dosen), indikator nyata, dan aksesibilitas ketat dengan desain yang "honest" tanpa _AI Slop_.
  **Penyelesaian**: Desain lama akan direkonsiliasi tanpa membuang komponen dasar; komponen akan ditata ulang agar fungsional untuk alur koreksi dan pembacaan bukti, mengikuti panduan `docs/03-spesifikasi-ui-ux.md`. Tidak ada fitur lama yang dihapus secara paksa, melainkan dimodifikasi fungsinya.
- **Status FR dan NFR Baseline**: Daftar fitur (FR6, FR7, dll) pada checklist lama mempertahankan definisi rangkap yang sering bertentangan di dokumen laporan lama.
  **Penyelesaian**: FR6 dan FR7 telah dipecah (FR6a, FR6b, FR7a, FR7b) sesuai instruksi di PRD 02, dilacak secara independen di dokumen traceability. Ekstraksi "Stretch" FR lama sekarang menjadi requirement baseline.
- **Tumpukan Skor AI vs Nilai Akhir (Arsitektur DB)**: Implementasi saat ini menggunakan relasi 1:1 `Submission` dengan `AIEvaluation` dan `Grade`. Model ini rentan menimpa riwayat nilai (upsert last-write-wins).
  **Penyelesaian**: Migrasi entitas data akan dilakukan (di Paket B) untuk mendukung historis versi: `SubmissionVersion`, `EvaluationRun`, dan `GradeRevision` (mempertahankan `TOTAL_OVERRIDE` dan data before/after pada revisi nilai).
- **RAG vs Pipeline Standar**: Skema lama mengandalkan `answerKeyEmbedding` di `RubricCriterion` dan langsung dikirim ke LLM.
  **Penyelesaian**: Harus didukung RAG asli yang menyimpan Document, melakukan ekstraksi OCR/NLP, menghasilkan chunk ber-metadata, lalu Retrieval yang terbatasi oleh kelas/tugas sebelum disisipkan ke context AI (Paket C). 

## 4. Langkah Berikutnya
1. **Selesai**: Dokumen PRD dan acuan sudah dibaca, file `01-traceability.md` (77 requirements) dan `02-plan.md` (Paket Implementasi) telah digenerate.
2. Meminta instruksi pengguna/dosen/developer untuk memulai Fase Implementasi (Fase R0) tanpa mendahului perintah.
3. Eksekusi "Paket A" sebagai tahap pembuka implementasi yang menangani otorisasi, proteksi privasi lintas kelas, dan pembatasan Payload DTO.
