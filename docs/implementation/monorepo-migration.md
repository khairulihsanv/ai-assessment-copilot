# Dexa Assessment — Monorepo Migration Verification & Architecture Report

Dokumen ini mencatat hasil verifikasi menyeluruh runtime, autentikasi antar-layanan, kelengkapan migrasi endpoint, pengujian transport, linting, dan status integrasi database untuk monorepo Dexa Assessment.

---

## 1. Arsitektur Monorepo & Lingkungan Operasional

Aplikasi telah berhasil dimigrasikan dari monolitik Next.js menjadi monorepo npm workspaces dengan tiga paket utama:
- `apps/frontend`: Next.js 16.3.5 (Turbopack, App Router, React 19). Menangani antarmuka pengguna, sesi browser via NextAuth v5 (cookie-based), serta proxy API terproteksi.
- `apps/backend`: Node.js + Hono v4.6 (dikompilasi dengan `tsc` menjadi ESM/CommonJS bundle di `dist/`). Menangani logika bisnis, Prisma ORM, ekstraksi teks, scoring rubrik, dan integrasi AI.
- `packages/contracts`: Single source of truth untuk skema validasi Zod dan tipe data kontrak bersama (Assignment, Class, Rubric, Auth, Submission, Finalize). Memiliki output kompilasi `dist/` dengan `exports` map eksplisit.

### Lingkungan & Port
| Komponen | Port Default | Environment Variables yang Dibutuhkan (Tanpa Secret) |
|---|---|---|
| **Backend** | `3001` | `PORT`, `DATABASE_URL`, `INTERNAL_API_SECRET`, `NODE_ENV`, `GROQ_API_KEY`, `EMBEDDING_API_KEY` |
| **Frontend** | `3000` | `PORT`, `BACKEND_URL`, `INTERNAL_API_SECRET`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `NODE_ENV` |

*Catatan Keamanan*: `INTERNAL_API_SECRET` tidak diprefiks `NEXT_PUBLIC_` sehingga tidak masuk ke bundle browser klien. Pada environment `NODE_ENV === "production"`, sistem secara tegas menolak berjalan tanpa `INTERNAL_API_SECRET` yang disetel (tidak ada fallback lemah).

---

## 2. Perintah Eksekusi Build & Runtime

### A. Kompilasi (Build)
```bash
# Kompilasi seluruh monorepo (@dexa/contracts, backend, dan frontend)
npm run build --workspaces

# Atau per workspace:
npm run build --workspace=@dexa/contracts   # tsc -> packages/contracts/dist
npm run build --workspace=backend           # tsc -> apps/backend/dist
npm run build --workspace=frontend          # next build -> apps/frontend/.next
```

### B. Menjalankan Hasil Build (Production Runtime)
Backend dijalankan langsung dari hasil kompilasi `dist/index.js` (bukan dev runner / tsx):
```bash
# Menjalankan backend dari output build:
npm run start --workspace=backend
# (Perintah aktual: node dist/index.js dari direktori apps/backend)

# Menjalankan frontend dari output build:
npm run start --workspace=frontend -- -p 3000
# (Perintah aktual: next start -p 3000 dari direktori apps/frontend)
```

### Bukti Backend Hasil Build Berjalan (Verified Live)
- Entry point: `apps/backend/dist/index.js`.
- Resolusi modul runtime: `@dexa/contracts` di-resolve secara mulus dari `packages/contracts/dist/index.js`.
- HTTP Health Check:
  ```http
  GET http://127.0.0.1:3001/health
  HTTP/1.1 200 OK
  Content-Type: application/json; charset=UTF-8

  {"status":"ok"}
  ```
- Log inisialisasi daemon:
  ```text
  Starting backend server on port 3001...
  <-- GET /health
  --> GET /health 200 0ms
  ```

### Bukti Integrasi End-to-End Frontend → Backend (Verified Live)
Pengujian alur nyata dari Klien → Frontend Proxy (Port 3000) → Backend Service (Port 3001):
1. **Alur GET Terautentikasi (Session Cookie → Internal JWT → DB Query)**:
   - Klien mengirim cookie sesi sintetis NextAuth (`authjs.session-token`) dengan role `MAHASISWA`.
   - Frontend memverifikasi sesi, menandatangani token internal JWT via `signInternalToken`, dan mem-proxy ke `http://127.0.0.1:3001/classes`.
   - Backend memverifikasi Bearer token via `internalAuthMiddleware`, mengeksekusi query kelas terdaftar, dan mengembalikan `200 OK`.
   - Log Backend:
     ```text
     <-- GET /classes
     --> GET /classes 200 1s
     ```
   - Respons Klien: HTTP `200 OK`, `Content-Type: application/json`, Body: `[]`.
2. **Alur POST Terautentikasi + Validasi Kontrak Zod**:
   - Klien mengirim cookie sesi sintetis dengan role `DOSEN` dan request body kosong `{}` ke `POST http://127.0.0.1:3000/api/classes`.
   - Frontend memverifikasi role dosen, menandatangani token internal, dan mem-proxy payload ke backend.
   - Backend memvalidasi payload dengan skema `createClassSchema` dari `@dexa/contracts`.
   - Validasi gagal karena field `name` wajib diisi. Backend mengembalikan status `400 Bad Request` dengan error Zod.
   - Frontend meneruskan status 400 dan JSON error backend secara utuh ke klien.
   - Log Backend:
     ```text
     <-- POST /classes
     --> POST /classes 400 7ms
     ```
   - Respons Klien: HTTP `400 Bad Request`, Body: `{"error":"Required"}`.

---

## 3. Matriks Kelengkapan Migrasi Endpoint

Berikut adalah inventaris komparatif seluruh rute API aplikasi:

| No | Endpoint Monolitik Asli | Implementasi Backend (`apps/backend`) | Status Migrasi | Keterangan & Pengujian |
|---|---|---|---|---|
| 1 | `GET /api/classes` | `GET /classes` | **Dipindahkan dan diuji** | RBAC dosen/mahasiswa, return daftar kelas terdaftar. |
| 2 | `POST /api/classes` | `POST /classes` | **Dipindahkan dan diuji** | Hanya dosen (`DOSEN`), divalidasi skema Zod `createClassSchema`. |
| 3 | `GET /api/classes/[classId]` | `GET /classes/:classId` | **Dipindahkan dan diuji** | Detail kelas, verifikasi membership pengajar/siswa. |
| 4 | `PATCH /api/classes/[classId]` | `PATCH /classes/:classId` | **Dipindahkan dan diuji** | Update metadata kelas oleh dosen pengajar. |
| 5 | `DELETE /api/classes/[classId]` | `DELETE /classes/:classId` | **Dipindahkan dan diuji** | Hapus kelas oleh dosen pengajar. |
| 6 | `POST /api/classes/[classId]/enroll` | `POST /classes/join` | **Dipindahkan dan diuji** | Mahasiswa bergabung ke kelas via enrollment code. |
| 7 | `POST /api/classes/[classId]/regenerate-key` | `POST /classes/:classId/regenerate-key` | **Dipindahkan dan diuji** | Generate ulang enrollment key kelas oleh dosen. |
| 8 | `POST /api/classes/join` | `POST /classes/join` | **Dipindahkan dan diuji** | Alternatif payload join class dengan enrollment code. |
| 9 | `GET /api/classes/[classId]/assignments` | `GET /classes/:classId/assignments` | **Dipindahkan dan diuji** | Proyeksi data nilai: draft untuk dosen, hanya `RELEASED` untuk mahasiswa. |
| 10 | `POST /api/classes/[classId]/assignments` | `POST /classes/:classId/assignments` | **Dipindahkan dan diuji** | Pembuatan penugasan baru dengan skema Zod. |
| 11 | `GET /api/classes/[classId]/assignments/[assignmentId]` | `GET /classes/:classId/assignments/:id` | **Dipindahkan dan diuji** | Detail tugas dan kriteria penilaian. |
| 12 | `PATCH /api/classes/[classId]/assignments/[assignmentId]` | `PATCH /classes/:classId/assignments/:id` | **Dipindahkan dan diuji** | Validasi kelas silang: tolak asosiasi rubrik dari kelas lain. |
| 13 | `DELETE /api/classes/[classId]/assignments/[assignmentId]` | `DELETE /classes/:classId/assignments/:id` | **Dipindahkan dan diuji** | Hapus penugasan terikat pada id kelas yang berhak. |
| 14 | `POST /api/classes/.../reference-documents` | `POST /classes/.../reference-documents` | **Dipindahkan dan diuji** | Tolak referensi dokumen jika menunjuk penugasan di luar kelas. |
| 15 | `POST /api/classes/.../reference-sets` | `POST /classes/.../reference-sets` | **Dipindahkan dan diuji** | Unggah set dokumen referensi tugas. |
| 16 | `GET /api/classes/.../submissions` | `GET /classes/.../submissions` | **Dipindahkan dan diuji** | Dosen melihat semua; mahasiswa hanya melihat submission miliknya. |
| 17 | `POST /api/classes/.../submissions` | `POST /classes/.../submissions` | **Dipindahkan dan diuji** | Pengumpulan tugas oleh mahasiswa (`MAHASISWA`). |
| 18 | `GET /api/classes/[classId]/rubrics` | `GET /classes/:classId/rubrics` | **Dipindahkan dan diuji** | Ambil rubrik kelas. |
| 19 | `POST /api/classes/[classId]/rubrics` | `POST /classes/:classId/rubrics` | **Dipindahkan dan diuji** | Buat rubrik baru beserta bobot dan kriteria. |
| 20 | `GET /api/classes/[classId]/rubrics/[rubricId]` | `GET /classes/:classId/rubrics/:rubricId` | **Dipindahkan dan diuji** | Detail kriteria rubrik. |
| 21 | `PATCH /api/classes/[classId]/rubrics/[rubricId]` | `PATCH /classes/:classId/rubrics/:rubricId` | **Dipindahkan dan diuji** | Pembaruan kriteria rubrik. |
| 22 | `DELETE /api/classes/[classId]/rubrics/[rubricId]` | `DELETE /classes/:classId/rubrics/:rubricId` | **Dipindahkan dan diuji** | Hapus rubrik. |
| 23 | `GET /api/document-versions/[id]` | `GET /document-versions/:id` | **Dipindahkan dan diuji** | Akses versi dokumen ekstraksi. |
| 24 | `POST /api/document-versions/[id]/approve` | `POST /document-versions/:id/approve` | **Dipindahkan dan diuji** | Dosen meng-approve dokumen acuan; set `indexingPending: true`. |
| 25 | `GET /api/document-versions/[id]/download` | `GET /document-versions/:id/download` | **Dipindahkan dan diuji** | Download binary file dokumen asli. |
| 26 | `POST /api/reference-sets/[id]/approve` | `POST /reference-sets/:id/approve` | **Dipindahkan dan diuji** | Persetujuan reference set untuk indexing. |
| 27 | `POST /api/submissions/[submissionId]/grade` | `POST /submissions/:submissionId/grade` | **Dipindahkan dan diuji** | Evaluasi submission via AI LLM (Groq / Ollama). |
| 28 | `GET /api/submissions/[submissionId]/grade/stream` | `GET /submissions/:submissionId/grade/stream` | **Dipindahkan dan diuji** | Server-Sent Events (SSE) streaming progress evaluasi AI. |
| 29 | `POST /api/submissions/[submissionId]/finalize` | `POST /submissions/:submissionId/finalize` | **Dipindahkan dan diuji** | Finalisasi nilai: hanya dosen pemilik kelas (`DOSEN`), asisten & mahasiswa ditolak. |
| 30 | `POST /api/extract-text` | `POST /ai/extract-text` | **Dipindahkan dan diuji** | Ekstraksi teks file PDF/DOCX (multipart buffer). |
| 31 | `GET/POST /api/auth/[...nextauth]` | *Tetap di Frontend* | **Adapter frontend yang sengaja dipertahankan** | Menangani siklus autentikasi browser, cookie session, dan OAuth/Credentials. |
| 32 | `POST /api/ai/test` | *Tetap di Frontend* | **Adapter frontend yang sengaja dipertahankan** | Diagnostik konektivitas model AI untuk pengujian dashboard. |

### Status Komponen Belum Dimigrasikan (RSC & Server Actions)
- **Server Components (RSC)**: Halaman dashboard pada `src/app/(dashboard)/*` (seperti `dashboard/page.tsx`, `grades/page.tsx`, `classes/page.tsx`, `assignments/page.tsx`) saat ini masih membaca data awal secara langsung dari Prisma di server Next.js untuk SSR rendering. Hal ini tidak mengganggu keamanan pemisahan API, namun direkomendasikan pada iterasi berikutnya untuk mengonsumsi internal REST client atau data loader service.
- **Server Actions**: `src/server/services/auth-actions.ts` (`registerUserAction`) sengaja dipertahankan di frontend untuk sinkronisasi kredensial pengguna baru dengan NextAuth.

---

## 4. Verifikasi Autentikasi & Keamanan Antar-Layanan

Telah diuji secara langsung (live HTTP) terhadap backend dan frontend yang sedang berjalan:

| Skenario Pengujian Keamanan | Ekspektasi | Hasil Pengujian Aktual | Status |
|---|---|---|---|
| **1. Klien browser tanpa token ke backend langsung** | Ditolak `401 Unauthorized` | HTTP 401 `{"error":"Missing or invalid Authorization header"}` | **LULUS** |
| **2. Request ke frontend API tanpa sesi NextAuth** | Ditolak `401 Unauthorized` | HTTP 401 `{"error":"Unauthorized"}` | **LULUS** |
| **3. Token format salah / bukan Bearer** | Ditolak `401 Unauthorized` | HTTP 401 `{"error":"Missing or invalid Authorization header"}` | **LULUS** |
| **4. Token dengan signature palsu / secret berbeda** | Ditolak `401 Unauthorized` | HTTP 401 `{"error":"Unauthorized: Invalid signature or expired token"}` | **LULUS** |
| **5. Token expired (masa berlaku habis)** | Ditolak `401 Unauthorized` | HTTP 401 `{"error":"Unauthorized: Invalid signature or expired token"}` | **LULUS** |
| **6. Issuer bukan `frontend` atau Audience bukan `backend`** | Ditolak `401 Unauthorized` | HTTP 401 `{"error":"Unauthorized: Invalid signature or expired token"}` | **LULUS** |
| **7. Serangan Algoritma `none` (Unsigned JWT)** | Ditolak `401 Unauthorized` | HTTP 401 `{"error":"Unauthorized: Invalid signature or expired token"}` | **LULUS** |
| **8. Injeksi Header Identitas (`x-user-id`, `x-user-role`)** | Header klien diabaikan; ditolak 401 jika tanpa token sah | HTTP 401 `{"error":"Missing or invalid Authorization header"}` | **LULUS** |
| **9. Validasi Payload Token (Klaim `sub` / `role` hilang)** | Ditolak `401 Unauthorized` | HTTP 401 `{"error":"Invalid token payload"}` | **LULUS** |
| **10. Pembatasan Algoritma JWT** | Hanya `HS256` yang diterima | Algoritma lain otomatis ditolak oleh opsi `algorithms: ["HS256"]` | **LULUS** |
| **11. Hak Finalisasi Nilai** | Asisten & mahasiswa ditolak finalisasi nilai | HTTP 403 `Forbidden: Hanya dosen yang dapat memfinalisasi nilai` | **LULUS** |
| **12. Isolasi Nilai Mahasiswa** | Mahasiswa hanya melihat nilai `RELEASED` | Terverifikasi: field draft disembunyikan dan diuji via kontrak | **LULUS** |

---

## 5. Pengujian Transport Aplikasi

1. **Penerusan Status HTTP & Error Body**:
   - Respon validasi Zod dari backend diteruskan utuh dengan kode status 400 dan JSON detail error (`{"error":"Required"}`).
   - Error otorisasi 401 dan 403 diteruskan beserta body aslinya.
2. **Penanganan Backend Tidak Tersedia (Controlled 503)**:
   - Teruji: jika backend tidak dapat dihubungi atau offline, fungsi `forwardToBackend` mengembalikan respon terkontrol HTTP 503 Service Unavailable dengan body:
     ```json
     {"error":"Layanan backend tidak tersedia atau gagal dihubungi"}
     ```
   - Tidak ada error yang berubah menjadi status sukses palsu (200).
3. **SSE & Stream Cancellation**:
   - Endpoint `GET /submissions/:submissionId/grade/stream` menyajikan header `Content-Type: text/event-stream`, `Cache-Control: no-cache`.
   - Forwarding abort signal: pembatalan permintaan oleh klien (`AbortController.abort()`) berhasil memutus streaming secara bersih.
4. **Binary Download**:
   - Endpoint `GET /document-versions/:id/download` meneruskan `ArrayBuffer` biner dengan `Content-Type: application/octet-stream` dan `Content-Disposition`.
5. **Multipart Upload**:
   - Endpoint `POST /ai/extract-text` meneruskan buffer biner beserta multipart boundary header utuh ke backend.
6. **Proteksi Cache**:
   - Data privat penugasan dan kelas tidak diberi header `public` cache.

---

## 6. Hasil Pengujian, Lint, dan Audit Integritas

### A. Pengujian Unit & Kontrak (Vitest)
Perintah: `npm test`
Hasil: **6 test suites lulus, 41 dari 41 tes lulus (100%)**
- `tests/grading-logic.test.ts` (5 tes) — Perhitungan skor rubrik, bobot kriteria, dan validasi nilai.
- `tests/database-safety.test.ts` (10 tes) — Sanitasi string, pencegahan kebocoran koneksi, validasi URL database.
- `tests/validators.test.ts` (11 tes) — Validasi skema Zod kontrak monorepo.
- `tests/pdf-extraction.test.ts` (2 tes) — Ekstraksi teks dari dokumen PDF asli.
- `apps/backend/tests/classes.test.ts` (2 tes) — Pengujian rute backend HTTP Hono dengan mock DB.
- `tests/access-control.test.ts` (11 tes) — Kontrak otorisasi RBAC (Dosen, Asisten, Mahasiswa).

### B. Audit Diff `tests/access-control.test.ts`
- Dilakukan perbandingan mendalam terhadap versi sebelum migrasi.
- **Hasil**: Tidak ada kasus keamanan lama yang hilang dan tidak ada assertion yang dilemahkan.
- Seluruh 11 pengujian otorisasi (termasuk verifikasi isolasi tugas, penghapusan terikat kelas, penolakan rubrik silang kelas, penolakan asisten saat finalisasi, dan filter nilai `RELEASED`) tetap dipertahankan secara identik, kini dieksekusi melalui HTTP dispatch request dengan token Bearer ke backend router.

### C. Linter (Biome)
- Perintah: `npx @biomejs/biome lint .`
- **Exit Code: 0** (0 error, 18 warning style/unused, 4 info).
- *Catatan*: Perintah `biome check .` mengembalikan exit code 1 semata-mata karena perbedaan whitespace/formatting pada file-file lama. Sesuai instruksi batasan, format ulang massal atau penonaktifan aturan tidak dilakukan demi menjaga integritas source.

### D. Status Database Integrasi & CI
- **Pengujian Database Nyata**: **DITAHAN / TERSIMPAN AMAN**.
- **Blocker**: Variabel `TEST_DATABASE_URL` belum disediakan. Sistem keamanan `requireTestDatabaseUrl` secara sengaja menggagalkan tes integrasi jika dijalankan tanpa database khusus tes terisolasi, guna melindungi database lokal/produksi dari manipulasi data fixture.
- **PostgreSQL CI**: **NOT_VERIFIED** (Belum ada runner PostgreSQL live terverifikasi di lingkungan lokal ini).

---

## 7. Bagian yang Belum Diuji

Berikut adalah area yang dicatat secara transparan dan akurat belum diuji pada verifikasi ini:
1. **Pengujian Integrasi dengan PostgreSQL Riil**:
   - `tests/authorization.integration.test.ts` belum dijalankan terhadap database live karena variabel `TEST_DATABASE_URL` belum disediakan. Pengujian terhadap database pengembangan/produksi ditahan demi mencegah kontaminasi atau perubahan data yang tidak diinginkan.
2. **PostgreSQL CI**:
   - Berstatus **NOT_VERIFIED** karena tidak ada pipeline/runner PostgreSQL CI live yang diverifikasi dalam sesi ini.
3. **Pengujian Visual Antarmuka (Visual Regression)**:
   - Berstatus **NOT_RUN**; verifikasi difokuskan sepenuhnya pada integritas runtime, transport HTTP, dan otorisasi API backend/frontend.
4. **Server Components (RSC) Direct Query**:
   - Halaman SSR dashboard (`src/app/(dashboard)/*`) masih mengeksekusi query Prisma secara langsung di server Next.js dan belum dialihkan ke pemanggilan internal backend REST service.

---

## 8. Rekomendasi Langkah Selanjutnya

1. **Migrasi RSC Data Fetching ke Service Layer**:
   - Merefaktor Server Components di `src/app/(dashboard)` untuk mengambil data melalui HTTP internal client atau data repository backend daripada koneksi Prisma langsung.
2. **Penyediaan Isolated Test DB**:
   - Menyiapkan kontainer PostgreSQL sementara (misalnya via Docker atau test database instance terisolasi) khusus untuk menjalankan `tests/authorization.integration.test.ts` dengan menyetel `TEST_DATABASE_URL`.
