# 🎓 Dexa Assessment
### Modern LMS Collaboration Hub & Intelligent Evaluation Platform

> Platform penugasan dan penilaian akademik berbasis **Next.js 16 (App Router BFF)** dan **Python FastAPI (Backend Utama)** dengan SQLAlchemy & Alembic, serta prinsip **Human-in-the-Loop (HITL)** — AI bertindak sebagai asisten pemeriksa objektif (memberikan draft rekomendasi skor & umpan balik), sedangkan penentuan dan publikasi nilai final tetap 100% berada di tangan dosen.

---

## 🏛️ Arsitektur Sistem

```
┌─────────────────────────────────┐
│     Next.js 16 (Port 3000)      │
│  - UI Rendering & Navigasi      │
│  - BFF & Session Cookie Proxy   │
└──────────────┬──────────────────┘
               │ HTTP / JSON (Internal Signed Token)
               ▼
┌─────────────────────────────────┐
│     Python FastAPI (Port 3001)  │
│  - Sumber Aturan Bisnis & Validasi
│  - Role-based Access Control    │
│  - Ekstraksi Dokumen & Engine AI│
│  - SQLAlchemy ORM & Alembic     │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  Database (PostgreSQL / SQLite) │
│  - Schema Alembic Migrations    │
└─────────────────────────────────┘
```

---

## 🌟 Fitur Utama & Filosofi Human-in-the-Loop (HITL)

1. **Peran AI vs Kontrol Dosen (HITL)**:
   - **AI Copilot**: Mengekstrak dokumen jawaban (PDF/DOCX/Teks), menganalisis kecocokan dengan instruksi penugasan dan rubrik penilaian berbobot, lalu menghasilkan **Draft Rekomendasi Nilai & Feedback**.
   - **Dosen Pengajar**: Memeriksa rekomendasi draft AI, dapat menyesuaikan nilai skor dan merevisi narasi umpan balik, lalu melakukan **Finalisasi & Publikasi Nilai**.
   - **Mahasiswa**: Hanya melihat nilai dan catatan umpan balik resmi setelah dipublikasikan oleh dosen. Draft AI dan prompt internal terisolasi aman di sisi backend.

2. **Manajemen Kelas & Enrollment Key**:
   - Dosen membuat kelas dan memperoleh **Kode Kelas 6 Karakter Unik**.
   - Fitur 1-click salin kode dan regenerasi kode acak untuk mencegah pendaftaran yang tidak sah.
   - Mahasiswa bergabung ke kelas secara instan menggunakan kode pendaftaran.

3. **Rubrik Penilaian Dinamis & Berbobot**:
   - Form builder kriteria rubrik interaktif dengan verifikasi total bobot otomatis (**tepat 100%**).
   - Template preset cepat: *Tugas Esai & Analisis*, *Tugas Pemrograman / Coding*, dan *Laporan Praktikum*.

4. **Multi-Format Submission**:
   - Menerima file dokumen **PDF** (`.pdf`), **Microsoft Word** (`.docx`), dan esai teks langsung.
   - Ekstraksi teks dokumen otomatis di backend Python (`pypdf` dan `python-docx`).

5. **Streaming AI Evaluation & Real-Time Grading**:
   - Dukungan Server-Sent Events (SSE) untuk visualisasi langkah AI secara real-time.

---

## 🛠️ Tech Stack

| Layer | Teknologi |
|---|---|
| **Frontend** | Next.js 16 (App Router, Server & Client Components, Web Crypto JWT) |
| **Styling** | Tailwind CSS v4, Lucide React Icons |
| **Backend** | Python 3.13, FastAPI, Uvicorn, Pydantic v2 |
| **Database & ORM** | PostgreSQL 16 (pgvector), SQLAlchemy 2.0, Alembic |
| **Document Processing** | `pypdf` (PDF) & `python-docx` (DOCX) |
| **AI LLM Engine** | Groq / Google Gemini / Ollama adapter |
| **Testing** | Playwright (E2E browser testing), Pytest (Isolated PostgreSQL DB) |

---

## 🚀 Panduan Setup & Menjalankan Proyek

### 1. Jalankan Container PostgreSQL & Install Dependensi

```bash
# Jalankan container Docker PostgreSQL dengan pgvector
docker compose up -d

# Install dependensi frontend & monorepo
npm install

# Install dependensi backend Python
cd apps/backend
pip install -r requirements.txt
cd ../..
```

### 2. Konfigurasi Environment Variables

File `.env` di root proyek:
```env
# Database PostgreSQL Utama
DATABASE_URL=postgresql://postgres:password@127.0.0.1:5432/ai_assessment_copilot

# Auth & Internal API Security
AUTH_SECRET=super-secret-dexa-assessment-key-change-in-production-2026
AUTH_URL=http://localhost:3000
BACKEND_URL=http://127.0.0.1:3001
```

File `apps/backend/.env`:
```env
DATABASE_URL=postgresql://postgres:password@127.0.0.1:5432/ai_assessment_copilot
TEST_DATABASE_URL=postgresql://postgres:password@127.0.0.1:5432/ai_assessment_test
SECRET_KEY=super-secret-dexa-assessment-key-change-in-production-2026
JWT_SECRET_KEY=super-secret-dexa-assessment-jwt-key-change-in-production-2026
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=720
STORAGE_DIR=./storage
```

### 3. Migrasi Database & Seeding Fixtures

```bash
cd apps/backend

# Jalankan migrasi Alembic (Mendukung database kosong maupun existing)
python -m alembic upgrade head

# Jalankan Seeding Akun & Data Pengujian
python seed_e2e_fixtures.py

cd ../..
```

### 4. Prosedur Backup & Restore Database

```bash
# 1. Buat Backup Binary PostgreSQL (disimpan di folder backups/)
docker exec ai_assessment_db pg_dump -U postgres -d ai_assessment_copilot -F c -f /tmp/backup_ai_assessment_copilot.dump
docker cp ai_assessment_db:/tmp/backup_ai_assessment_copilot.dump ./backups/backup_ai_assessment_copilot.dump

# 2. Salin file dump lokal ke container untuk dipulihkan
docker cp ./backups/backup_ai_assessment_copilot.dump ai_assessment_db:/tmp/restore_input.dump

# 3. Siapkan Database Terisolasi (Jalankan sebagai DUA perintah terpisah)
docker exec ai_assessment_db psql -U postgres -c "DROP DATABASE IF EXISTS ai_assessment_restore_test;"
docker exec ai_assessment_db psql -U postgres -c "CREATE DATABASE ai_assessment_restore_test;"

# 4. Pemulihan (Restore) ke Database Terisolasi
docker exec ai_assessment_db pg_restore -U postgres -d ai_assessment_restore_test --no-owner --no-privileges /tmp/restore_input.dump

# 5. Uji Verifikasi Paritas Mendalam (Data, Index HNSW, Constraint, pgvector)
python scripts/verify_restore.py
```

### 5. Menjalankan Server (Frontend + Backend)

Jalankan kedua service secara bersamaan:

```bash
# Terminal 1 — Jalankan Backend FastAPI (Port 3001)
cd apps/backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 3001

# Terminal 2 — Jalankan Frontend Next.js (Port 3000)
npm run dev -w apps/frontend
```

Buka browser di [http://localhost:3000](http://localhost:3000).

---

## 🔑 Akun Uji Coba

| Peran | Email | Kata Sandi | Keterangan |
|---|---|---|---|
| **Dosen** | `dosen_a@test.local` | `Password123!` | Kelas *Rekayasa Perangkat Lunak A* (`KEY-RPLA`) |
| **Dosen B** | `dosen_b@test.local` | `Password123!` | Kelas *Basis Data B* (`KEY-BDB`) |
| **Mahasiswa** | `mhs_a@test.local` | `Password123!` | Mahasiswa terdaftar di RPL A |
| **Mahasiswa B**| `mhs_b@test.local` | `Password123!` | Mahasiswa untuk uji gabung kelas |

---

## 🧪 Rangkaian Pengujian & Verifikasi

Semua pengujian telah diverifikasi dan lulus 100%:

```bash
# 1. Menjalankan Seluruh E2E Test Playwright (15/15 Passed)
npx playwright test --project="Desktop Chrome"

# 2. Menjalankan Unit & Regression Test FastAPI Pytest (15/15 Passed)
cd apps/backend
python -m pytest tests/ -v
cd ../..

# 3. Menjalankan Typecheck Monorepo (Mypy + TSC 0 Issues)
npm run typecheck

# 4. Menjalankan Linting Monorepo (Biome 0 Errors)
npm run lint
```

---

## 🏛️ Lisensi & Hak Cipta
Dexa Assessment © 2026. Dikembangkan dengan standar arsitektur clean code, isolasi kontrol akses multi-role, dan prinsip Human-in-the-Loop.
