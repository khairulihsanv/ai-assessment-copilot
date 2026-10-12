# Laporan Verifikasi End-to-End (E2E) Dexa Assessment

Laporan ini mendokumentasikan pelaksanaan pengujian verifikasi menyeluruh *end-to-end* (UI → Frontend Next.js → Backend Hono → PostgreSQL Test Database), pemeriksaan keamanan akses, serta perbaikan regresi runtime yang ditemukan pada monorepo Dexa Assessment.

---

## 1. Ringkasan Eksekutif & Status Verifikasi

| Domain Pengujian | Target / Lingkungan | Status | Jumlah Kasus | Exit Code |
| :--- | :--- | :---: | :---: | :---: |
| **Unit & Contract Tests** | In-Memory / Mocks (Vitest) | **LULUS** | 56 / 56 | `0` |
| **PostgreSQL Integration Tests** | PostgreSQL 18.6 + pgvector (Non-superuser, loopback proxy) | **LULUS** | 12 / 12 | `0` |
| **Browser E2E Tests** | Playwright (Desktop Chrome 1280x800 & Mobile Pixel 5) | **LULUS** | 18 / 18 | `0` |
| **Database Access Control Tests** | Explicit `SELECT 1` (Positif + 2 Negatif pg_hba rejection) | **LULUS** | 3 / 3 | `0` |
| **LLM Output Parser & Contracts** | Schema validation, markdown fence extraction, error modes | **LULUS** | 8 / 8 | `0` |
| **Local LLM Smoke Test** | Real Ollama `127.0.0.1:11434` (`qwen3:4b`, `think:false`) | **LULUS** | 1 smoke run | `0` |
| **TypeScript Workspace Typecheck** | `@dexa/contracts`, `apps/backend`, `apps/frontend` | **LULUS** | 0 error | `0` |
| **Production Workspace Build** | Turbopack Next.js frontend, backend tsc, contracts tsc | **LULUS** | 0 error | `0` |

---

## 2. Cara Menjalankan Pengujian dari Kondisi Awal

### 2.1. Prasyarat Lingkungan
1. **Node.js** v20+ atau v24+.
2. **WSL2 Ubuntu** dengan instance PostgreSQL 18 dan ekstensi `pgvector` aktif di service `postgresql`.
3. **Database Proxy / Keep-alive**:
   - WSL keep-alive: `wsl -d Ubuntu -u root -- sleep infinity`
   - TCP forwarder loopback: `npx tsx scripts/wsl-pg-proxy.ts` (meneruskan `127.0.0.1:54321` → WSL `172.30.150.98:5432`).

### 2.2. Migrasi Database Test Kosong
Migrasi schema dijalankan secara resmi menggunakan Prisma Migrate Deploy tanpa `db push`:
```bash
$env:DATABASE_URL="postgresql://test_user:test_password@127.0.0.1:54321/test_db?schema=public&sslmode=disable"
npx prisma migrate deploy
```
*Daftar migrasi yang dideploy*:
- `0_init`
- `20261002035300_paket_b_history`
- `20261002060000_reference_documents`
- `20261004100000_rag_pipeline`

### 2.3. Menjalankan Seluruh Suite Pengujian

```bash
# 1. Menjalankan Unit & Contract Tests
npm run test

# 2. Menjalankan PostgreSQL Integration Tests (backend otomatis di-spawn dan dibersihkan)
$env:TEST_DATABASE_URL="postgresql://test_user:test_password@127.0.0.1:54321/test_db?schema=public&sslmode=disable"
npm run test:integration

# 3. Menjalankan Full Playwright E2E Suite (UI -> Frontend -> Backend -> Test DB)
npm run test:e2e

# 4. Menjalankan Local Ollama Smoke Test (opsional)
npx tsx scripts/ollama-smoke.ts
```

---

## 3. Isolasi Database Test & Keamanan Kredensial

### 3.1. Bukti Isolasi & Hardening Jaringan
- **Engine**: PostgreSQL 18.6 (Ubuntu 24.04 via WSL2) dengan ekstensi `vector` (pgvector 0.8.1).
- **Effective Listener**: Dikonfigurasi secara ketat hanya pada `listen_addresses = 'localhost,172.30.150.98'`. PostgreSQL terbukti **TIDAK** membuka port pada listener publik `0.0.0.0` atau `*` (diverifikasi via `ss -tlnp 'sport = :5432'`: hanya socket `127.0.0.1:5432` dan `172.30.150.98:5432` yang aktif).
- **Effective Access Control (`pg_hba.conf`)**:
  - Seluruh aturan luas seperti `0.0.0.0/0` atau `172.16.0.0/12` telah dibersihkan.
  - Aturan koneksi jaringan dibatasi hanya pada single host `/32` spesifik:
    ```
    host    test_db    test_user    127.0.0.1/32       scram-sha-256
    host    test_db    test_user    172.30.144.1/32    scram-sha-256
    ```
  - `172.30.144.1/32` merupakan alamat IP virtual gateway host Windows aktual pada interface vEthernet WSL. Skrip setup (`scripts/setup-wsl-postgres.sh`) mendeteksi rute ini secara otomatis dan dinamis (`ip route | awk '/default/ {print $3}'`), sehingga jika IP WSL berubah, skrip dapat dijalankan ulang secara idempotent tanpa pernah mengembalikan aturan akses luas.
- **Hak Akses Role Test**:
  - Role `test_user` diverifikasi berstatus **NON-SUPERUSER** (`NOSUPERUSER NOCREATEDB NOCREATEROLE`, diverifikasi via `\du test_user`).
  - Hanya memiliki izin DDL/DML pada schema `public` di dalam database `test_db`.
- **Target Connection**: Terikat secara eksklusif ke loopback IPv4 lokal `127.0.0.1:54321` melalui proxy TCP (`scripts/wsl-pg-proxy.ts`).
- **Proteksi Fallback**: Modul konfigurasi database (`requireTestDatabaseUrl`) mewajibkan nilai connection string loopback eksplisit. Fallback ke `DATABASE_URL` produksi (NeonDB) diblokir secara mutlak pada runtime pengujian.

### 3.2. Hasil Uji Kontrol Koneksi Database Eksplisit (`SELECT 1`)
Diverifikasi melalui eksekusi riil `scripts/verify-db-access.ts` dengan query SQL primitif `SELECT 1 AS alive`:

| ID Kontrol | Pengguna & Database | Koneksi & Query | Status | Klasifikasi Error Aktual |
| :---: | :--- | :--- | :---: | :--- |
| **Kontrol Positif** | `test_user` → `test_db` | TCP `127.0.0.1:54321` → `SELECT 1` | **PASS** | Terhubung, hasil query: `[{ alive: 1 }]` |
| **Kontrol Negatif 1** | `test_user` → `postgres` (database lain) | TCP `127.0.0.1:54321` → `SELECT 1` | **PASS (DITOLAK)** | `AUTH_OR_HBA_REJECTION` (`User test_user was denied access on database postgres`) |
| **Kontrol Negatif 2** | `postgres` → `postgres` via TCP proxy | TCP `127.0.0.1:54321` → `SELECT 1` | **PASS (DITOLAK)** | `AUTH_OR_HBA_REJECTION` (`User postgres was denied access on database postgres`) |

*Catatan*: Pengujian penolakan tidak lagi menggunakan asumsi ada/tidaknya tabel aplikasi, melainkan murni mengevaluasi respon otentikasi/otorisasi PostgreSQL tingkat koneksi. Kredensial superuser tidak dimodifikasi.

---

## 4. Pemisahan Jenis Bukti (Taxonomy of Evidence)

Pengujian sengaja memisahkan 5 kategori bukti agar tidak ada klaim kelulusan palsu:

1. **Unit & Contract Tests (`tests/*.test.ts`, `apps/**/*.test.ts`)**:
   - Memvalidasi skema Zod, hashing password, parser teks, format utilitas, dan kontrak otorisasi handler menggunakan database tiruan (mock DB). Tidak menguji koneksi jaringan fisik atau SQL engine sesungguhnya.
2. **PostgreSQL Integration Tests (`tests/authorization.integration.test.ts`)**:
   - Menguji query database aktual, transaksi, locking grade revision, dan relasi multi-tabel di atas PostgreSQL 18 fisik melalui route handler backend.
3. **Browser E2E Tests (`tests/e2e/*.spec.ts`)**:
   - Menguji alur interaktif pengguna sesungguhnya (klik form, input teks, upload file, reload halaman, validasi DOM, navigasi) pada browser Chromium/Chrome aktual.
4. **Deterministic AI Stub Provider (`scripts/ai-stub-server.ts`)**:
   - Menyediakan respons evaluasi AI yang konsisten dan deterministik (skor 85, kriteria terpetakan, umpan balik konstruktif) melalui HTTP mock port 3002. Memastikan pengujian alur inti penilaian tidak fluktuatif atau bergantung pada koneksi internet/kuota pihak ketiga.
5. **Local Ollama Smoke Test (`scripts/ollama-smoke.ts`)**:
   - Pengujian terisolasi langsung ke runtime Ollama lokal (`qwen3:4b`). Hasilnya dicatat sebagai bukti kinerja inferensi model fisik, bukan sebagai penentu lulus/gagalnya alur inti web app.

---

## 5. Matriks Skenario, Hasil, dan Bukti Runtime

### 5.1. Alur Autentikasi Interaktif (`01-auth-flow.spec.ts`)
| ID | Skenario | Langkah Interaksi | Status | Bukti Runtime |
| :---: | :--- | :--- | :---: | :--- |
| `AUTH-01` | Login Gagal (Kata Sandi Salah) | Input kata sandi keliru di `/login`, submit form | **PASS** | Alert *"Email atau kata sandi tidak cocok"* tampil, URL tetap di `/login` |
| `AUTH-02` | Dosen Login Interaktif | Input email & sandi valid di UI `/login` | **PASS** | Redirect ke `/dashboard`, nama *"Dr. Dosen A, M.Kom."* tampil di viewport |
| `AUTH-03` | Mahasiswa Login Interaktif | Input email & sandi mahasiswa di UI `/login` | **PASS** | Redirect ke `/dashboard`, nama *"Mahasiswa A Pratama"* tampil di viewport |

### 5.2. Alur Pengguna Inti: Kelas → Tugas → Submisi → Review → Nilai (`02-core-user-flows.spec.ts`)
| ID | Alur | Langkah Interaksi | Status | Bukti Runtime |
| :---: | :--- | :--- | :---: | :--- |
| `CORE-01` | **Flow A: Dosen Buat Kelas & Penugasan** | Dosen login → Buat kelas via modal → Buka detail kelas → Salin token pendaftaran → Buat tugas baru via `/assignments/new` → Terbitkan | **PASS** | Tugas tersimpan di PostgreSQL test, data instruksi dan tenggat persisten setelah reload |
| `CORE-02` | **Flow B: Mahasiswa Gabung & Kumpul Tugas** | Mahasiswa login di konteks browser terpisah → Gabung kelas via modal dengan kode token Flow A → Buka tugas → Isi esai jawaban → Kumpulkan | **PASS** | Submisi tersimpan (HTTP 201), status berubah menjadi *"Kirim Ulang Jawaban"*, teks persisten setelah reload |
| `CORE-03` | **Flow C: Review, Draft Privat, & Publikasi Nilai** | Dosen buka penugasan → Klik review submisi → Mahasiswa cek (nilai belum tampil) → Dosen isi skor 88 & feedback → Publikasikan | **PASS** | Mahasiswa reload: Nilai `88 / 100` dan umpan balik tampil. Perubahan nilai sah `0` tetap tampil sebagai `0 / 100` secara akurat |

### 5.3. Pemeriksaan Akses & Keamanan Sistem (`03-access-control.spec.ts`)
| ID | Skenario Keamanan | Kondisi Uji | Status | Bukti Runtime |
| :---: | :--- | :--- | :---: | :--- |
| `SEC-01` | Akses Tanpa Sesi | Request ke `GET /api/classes` tanpa cookie auth | **PASS** | HTTP 401 Unauthorized |
| `SEC-02` | Isolasi Antar-Mahasiswa | Mahasiswa B mengakses submisi Mahasiswa A via URL dan API | **PASS** | URL dialihkan / ditolak HTTP 403; data Mahasiswa A tidak muncul di list |
| `SEC-03` | Modifikasi Lintas-Dosen | Dosen B mencoba `PATCH /api/classes/[classAId]` | **PASS** | HTTP 404 / 403 Forbidden |
| `SEC-04` | Pencegahan Kebocoran Data | Mahasiswa A memanggil `GET /api/classes` & `GET /api/classes/[id]` | **PASS** | `enrollmentKey`, `answerKey`, dan draft evaluation bernilai `undefined` |
| `SEC-05` | Anti-Spoofing Header | Browser mengirim `x-user-id: fake` dan `x-role: DOSEN` | **PASS** | Permintaan pembuatan kelas ditolak HTTP 401/403 (sesi token asli dihormati) |
| `SEC-06` | Validasi Token Internal Backend | 1 Kontrol Positif + 5 Kasus Negatif (Signature palsu, Expired, Issuer salah, Audience salah, Missing claims) | **PASS** | Kontrol positif HTTP 200, kelima kasus negatif langsung ditolak HTTP 401 |

### 5.4. Pemeriksaan UI Responsif & Tampilan (`04-ui-responsiveness.spec.ts`)
| ID | Halaman | Viewport | Status | Bukti Runtime |
| :---: | :--- | :--- | :---: | :--- |
| `UI-01` | Halaman Login | Desktop (1280x800) | **PASS** | `scrollWidth <= innerWidth` (No horizontal overflow), bebas hydration error |
| `UI-02` | Halaman Kelas | Desktop (1280x800) | **PASS** | Tombol buat kelas dan kartu terdistribusi rapi, no overflow |
| `UI-03` | Detail Kelas & Tugas | Desktop (1280x800) | **PASS** | Layout dua kolom rapi, breadcrumb navigasi berfungsi |
| `UI-04` | Halaman Login | Mobile Pixel 5 (375x667) | **PASS** | Input dan tombol submit responsif dan mudah ditekan, no horizontal overflow |
| `UI-05` | Halaman Kelas | Mobile Pixel 5 (375x667) | **PASS** | Modal gabung kelas pas di layar ponsel, tidak ada clipping |
| `UI-06` | Detail Kelas & Tugas | Mobile Pixel 5 (375x667) | **PASS** | Tabs navigasi wrap rapi, panel pengumpulan tugas pas di viewport ponsel |

---

## 6. Perbaikan Kode yang Dilakukan (Root Cause & Fixes)

1. **NextAuth v5 beta.32 Credential Error Handling** (`apps/frontend/src/app/(auth)/login/page.tsx` & `register/page.tsx`):
   - *Akar Masalah*: `signIn("credentials", { redirect: false })` mengembalikan object `{ ok: true, error: "CredentialsSignin" }` pada kegagalan password. Kondisi lama `if (result?.ok)` salah menganggap login sukses dan me-redirect ke dashboard yang kemudian memantul kembali ke login.
   - *Perbaikan*: Diperbarui menjadi `if (result?.ok && !result?.error)`.

2. **Kebocoran `enrollmentKey` ke Mahasiswa pada `GET /classes`** (`apps/backend/src/routes/classes.ts`):
   - *Akar Masalah*: Query `prisma.class.findMany` untuk mahasiswa mengambil seluruh kolom model `Class`, membocorkan token pendaftaran rahasia ke respons JSON mahasiswa.
   - *Perbaikan*: Menambahkan sanitasi eksplisit pada respons mahasiswa:
     ```ts
     const sanitized = isDosen
       ? classes
       : classes.map(({ enrollmentKey: _, ...rest }) => rest);
     ```

3. **Locator Ambiguitas & Testability DOM** (`apps/frontend/src/components/features/regenerate-key-button.tsx`):
   - *Akar Masalah*: Elemen kode token tidak memiliki identifier unik, sehingga terancam tertukar dengan teks badge *"Bagikan ke Mhs"*.
   - *Perbaikan*: Menambahkan `id="classEnrollmentKey"` pada elemen span token kelas.

4. **Inisialisasi Tab Pengumpulan Tugas** (`apps/frontend/src/components/features/submission-uploader.tsx`):
   - *Akar Masalah*: Saat reload submisi bertipe `TEXT`, form uploader secara default kembali ke tab `FILE`.
   - *Perbaikan*: Inisialisasi `activeTab` otomatis memilih `text` jika `existingSubmission?.type === "TEXT"`.

6. **LLM Structured Output Parser & Kontrak Skema Zod** (`packages/contracts/src/schemas/llm.ts` & `apps/backend/src/ai/grading-client.ts`):
   - *Akar Masalah*: Evaluasi respons LLM sebelumnya mengandalkan `JSON.parse` mentah tanpa perlindungan terhadap code fences markdown (` ```json `), output terpotong (syntax truncation), field yang hilang, atau nilai skor di luar batas.
   - *Perbaikan*: Dibuat modul `@dexa/contracts/schemas/llm.ts` yang mengekspor `parseStructuredLLMOutput`, `extractJsonCandidate`, `smokeEvaluationSchema`, dan `gradingResponseSchema`. Jalur produksi `grading-client.ts` dimigrasikan untuk menggunakan parser ini. Seluruh 8 skenario pengujian parser (JSON murni, code fence, missing field, wrong type, score out-of-range, truncated JSON, teks non-JSON, dan multi-criteria grading) terbukti **LULUS** pada `tests/llm-parser.test.ts`.

---

## 7. Bukti Inferensi & Diagnosis Ollama Lokal (`scripts/ollama-smoke.ts`)

### 7.1. Diagnosis Akar Masalah `parsedResponse: null`
- **Model**: `qwen3:4b` (keluarga Qwen3 reasoning model dengan kemampuan native `thinking`).
- **Penyebab Kegagalan Lama**: Pada konfigurasi lama dengan `num_predict: 80` atau `200`, model menghabiskan seluruh token yang dialokasikan di dalam fase internal reasoning (`thinking`, menghasilkan `thinking_length: 1221` karakter). Ketika batas token tercapai (`done_reason: "length"`), fase generasi isi utama (`response`) belum sempat menghasilkan token apapun (`rawResponse: ""`), sehingga parsing menghasilkan `null`.
- **Solusi Definitif**: Mengatur parameter native Ollama API `think: false` pada level root request payload. Hal ini menonaktifkan rantai pemikiran panjang yang tidak diperlukan untuk ekstraksi JSON terstruktur, dan memaksa model menghasilkan respons JSON secara langsung.

### 7.2. Hasil Smoke Test Riil (Tunggal & Terisolasi)
Dijalankan secara langsung menggunakan `npx tsx scripts/ollama-smoke.ts`:

| Parameter Metrik | Nilai Aktual Terukur | Evaluasi Kontrak |
| :--- | :--- | :---: |
| **Model** | `qwen3:4b` (4.0B parameter, Q4_K_M) | Sesuai |
| **Durasi Inferensi CPU** | `19.299 ms` (~19,3 detik) | Jauh di bawah batas timeout 60s |
| **Status Transport (`transportSuccess`)** | `true` (HTTP 200) | Sesuai |
| **Status Skema (`schemaSuccess`)** | `true` (Valid terhadap `smokeEvaluationSchema`) | Sesuai |
| **Validitas Konten (`contentValid`)** | `true` (score 85, feedback bermakna) | Sesuai |
| **Done Reason** | `"stop"` (Bukan `"length"`) | Tidak terpotong |
| **Prompt Tokens** | `128` tokens | Efisien |
| **Response Tokens** | `35` tokens | Terfokus & padat |
| **Raw JSON Output** | `{"score": 85, "feedback": "Penjelasan mencakup aktor dan kebutuhan fungsional utama."}` | Valid JSON |
| **Hasil Parsing Akhir** | `{ score: 85, feedback: "Penjelasan mencakup aktor dan kebutuhan fungsional utama." }` | Sesuai skema |
| **Overall Status** | **PASS (`overallSuccess: true`)** | Tanpa skor default / guessing |

*Catatan Kritis*: Hasil lulus pada smoke test ini membuktikan bahwa protokol transport, penonaktifan thinking, parser markdown, dan validasi skema Zod berfungsi secara presisi. Namun, hasil ini **TIDAK** menjadi klaim atas akurasi semantik RAG atau kualitas pedagogis penilaian model, melainkan validasi kelayakan antarmuka runtime.

---

## 8. Verifikasi Akhir & Rekapitulasi Rangkaian Tes

| Perintah | Ruang Lingkup | Exit Code | Hasil Verifikasi |
| :--- | :--- | :---: | :--- |
| `npm run typecheck` | Monorepo (`@dexa/contracts`, `apps/backend`, `apps/frontend`) | `0` | **0 error**, seluruh types tersinkronisasi |
| `npm run build` | Kompilasi Workspace (`tsc` backend/contracts, `next build` frontend) | `0` | **0 error**, static & dynamic routes lolos |
| `npx @biomejs/biome check` | File yang Diubah (Parser, Smoke test, DB verification) | `0` | **0 error**, formatting & lint rules terpenuhi |
| `npm run test` | 8 File Unit, Contract, & Parser Tests (Vitest) | `0` | **56 passed (56/56)** |
| `npm run test:integration` | 1 File PostgreSQL Integration Test (Live DB + Non-superuser) | `0` | **12 passed (12/12)** |
| `npm run test:e2e` | 4 File Browser E2E Specs Playwright (Desktop & Mobile Chrome) | `0` | **18 passed (18/18)** |
| `npx tsx scripts/verify-db-access.ts` | Kontrol Akses Database Eksplisit (`SELECT 1`) | `0` | **3 passed (3/3)** (1 positif, 2 penolakan pg_hba) |
| `npx tsx scripts/ollama-smoke.ts` | Smoke Test Ollama Lokal Riil | `0` | **1 passed** (Schema & content valid) |

### 8.1. Status Penutupan & Tidak Ada Blocker Tersisa
- **Infrastruktur DB**: Terisolasi ketat di loopback port 54321, listener terbatas ke localhost dan IP WSL khusus, aturan pg_hba single-host `/32`, dan role `test_user` berstatus non-superuser.
- **Autentikasi Antar-Layanan**: Terverifikasi aman (penolakan token palsu/expired/beda issuer/secret lemah).
- **Integritas Penilaian & Data**: Dosen tetap memegang wewenang finalisasi nilai; tidak ada kebocoran kunci jawaban atau draft penilaian ke mahasiswa.
- **Rangkaian Tes**: Seluruh tahapan verifikasi telah selesai dengan status lulus tanpa ada blocker tersisa.
