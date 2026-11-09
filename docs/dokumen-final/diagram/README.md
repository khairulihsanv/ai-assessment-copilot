# Diagram Dexa Assessment

Sumber Mermaid untuk semua diagram di dokumen BRD/SRS dan Fundamental Proyek. GitHub merender blok di bawah langsung; versi gambar ada di folder ini (`<nama>.png`).

## Arsitektur sistem

Gambar: `arsitektur.png`

```mermaid
flowchart TB
  subgraph K[Klien]
    direction LR
    B[Browser<br/>dosen dan mahasiswa]
    M[Aplikasi mobile mahasiswa<br/>Flutter, tanpa LLM]
  end
  subgraph V[Vercel - region Singapura]
    FE[Frontend Next.js 16<br/>halaman + BFF /api]
  end
  subgraph S[Server backend - Docker]
    T[Tailscale Funnel<br/>HTTPS publik]
    BE[Backend FastAPI<br/>aturan bisnis, OCR, pipeline AI]
    DB[(PostgreSQL 16<br/>+ pgvector)]
    ST[(Berkas jawaban<br/>dan acuan)]
  end
  subgraph X[Layanan model]
    direction LR
    LLM[Groq API<br/>openai/gpt-oss-120b]
    EMB[Ollama<br/>nomic-embed-text, opsional]
  end
  B -- HTTPS --> FE
  FE -- token internal --> T
  M -- Bearer token --> T
  T --> BE
  BE --> DB
  BE --> ST
  BE -- teks tersamar --> LLM
  BE -.-> EMB
```

## Flowchart sistem

Gambar: `flowchart.png`

```mermaid
flowchart LR
  subgraph P1["Tahap 1 – Persiapan"]
    direction TB
    A([Mulai]) --> B[Buat kelas]
    B --> C[Susun rubrik<br/>bobot total 100%]
    C --> D[Buat tugas,<br/>tautkan rubrik]
    D --> E[Bagikan kode kelas]
  end
  subgraph P2["Tahap 2 – Pengumpulan"]
    direction TB
    E1[Gabung kelas<br/>dengan kode] --> F[Kirim jawaban:<br/>teks, PDF, DOCX, foto]
    F --> G{Terdaftar, sebelum<br/>tenggat, format valid?}
    G -- Tidak --> F1[Tolak dengan alasan]
    F1 --> F
    G -- Ya --> H[Simpan versi jawaban]
  end
  subgraph P3["Tahap 3 – Penilaian"]
    direction TB
    I[Dosen membuka jawaban] --> J{Minta draf AI?}
    J -- Ya --> K[Pipeline AI:<br/>bukti, penyamaran, model]
    K --> L{Model tersedia,<br/>respons valid?}
    L -- Ya --> N[Draf per kriteria<br/>+ kutipan bukti]
    L -- Tidak --> M1[Tanpa skor pengganti]
    J -- Tidak --> O
    N --> O[Dosen terima, ubah,<br/>atau tolak tiap kriteria]
    M1 --> O
    O --> P[Sistem hitung<br/>total berbobot]
    P --> Q[Rilis nilai]
    Q --> R[Mahasiswa melihat nilai<br/>di web atau mobile]
    R --> S([Selesai])
  end
  P1 ==> P2
  P2 ==> P3
```

## Use case diagram

Gambar: `usecase.png`

```mermaid
flowchart LR
  D(("Dosen"))
  subgraph SYS[Sistem Dexa Assessment]
    direction TB
    U1([Daftar dan masuk])
    U2([Kelola kelas dan kode gabung])
    U3([Kelola rubrik dan kriteria])
    U4([Kelola tugas])
    U5([Unggah dan setujui dokumen acuan])
    U10([Tinjau dan putuskan nilai])
    U9([Minta draf AI])
    U11([Rilis atau batalkan rilis nilai])
    U13([Lihat analitik penilaian])
    U6([Gabung kelas])
    U7([Kirim jawaban])
    U8([Kirim foto jawaban + OCR])
    U12([Lihat nilai dan umpan balik])
  end
  MH(("Mahasiswa"))
  AI(("Layanan LLM"))
  D --- U1 & U2 & U3 & U4 & U5 & U10 & U11 & U13
  U1 & U6 & U7 & U12 --- MH
  U9 -. extend .-> U10
  U8 -. extend .-> U7
  U9 --- AI
```

## Activity diagram: mahasiswa mengumpulkan jawaban

Gambar: `activity_kirim.png`

```mermaid
flowchart TB
  a1([Mulai]):::m --> a2[Mahasiswa membuka tugas]:::m
  a2 --> a3{Cara mengumpulkan}:::m
  a3 -- Teks --> a4[Tulis jawaban]:::m
  a3 -- Dokumen --> a5[Pilih PDF/DOCX<br/>maks. 10 MB]:::m
  a3 -- Foto --> a6[Foto tiap halaman,<br/>koreksi teks OCR]:::m
  a4 --> a8[Kirim]:::m
  a5 --> a8
  a6 --> a8
  a8 --> s1{Terdaftar, PUBLISHED, sebelum<br/>tenggat, nilai belum dirilis?}:::s
  s1 -- Tidak --> s2[Tampilkan alasan penolakan]:::s
  s1 -- Ya --> s3{Format dan ukuran valid,<br/>teks terbaca?}:::s
  s3 -- Tidak --> s2
  s2 -.-> a2
  s3 -- Ya --> s4[Simpan versi baru,<br/>jadikan versi aktif]:::s
  s4 --> s5[Tampilkan konfirmasi]:::s
  s5 --> e([Selesai]):::m
  classDef m fill:#e6f2ec,stroke:#03633e,color:#111
  classDef s fill:#eef1f6,stroke:#4a5a78,color:#111
```

## Activity diagram: dosen menilai dengan draf AI

Gambar: `activity_nilai.png`

```mermaid
flowchart TB
  d1([Mulai]):::d --> d2[Dosen membuka jawaban<br/>di halaman Tinjau]:::d
  d2 --> d3{Draf AI untuk<br/>versi ini sudah ada?}:::d
  d3 -- Belum --> d4[Klik Jalankan AI]:::d
  d4 --> s1[Buat job draf<br/>satu per jawaban]:::s
  s1 --> s2[Pecah passage, cari bukti<br/>per kriteria, samarkan identitas]:::s
  s2 --> s4[Kirim ke model;<br/>tunggu bila kena limit]:::s
  s4 --> s5{Respons valid?}:::s
  s5 -- Tidak --> s6[Gagal tanpa<br/>skor pengganti]:::s
  s5 -- Ya --> s7[Verifikasi kutipan, jepit skor,<br/>tandai perlu dicek, hitung total]:::s
  s7 --> d5[Baca kutipan bukti<br/>tiap kriteria]:::d
  d3 -- Sudah --> d5
  s6 --> d6
  d5 --> d6[Terima, ubah, atau tolak<br/>skor tiap kriteria]:::d
  d6 --> d7[Tulis umpan balik<br/>dan rilis nilai]:::d
  d7 --> d9([Selesai]):::d
  classDef d fill:#e6f2ec,stroke:#03633e,color:#111
  classDef s fill:#eef1f6,stroke:#4a5a78,color:#111
```

## Sequence diagram: pembuatan draf AI

Gambar: `sequence_ai.png`

```mermaid
sequenceDiagram
  autonumber
  actor D as Dosen
  participant W as Web + BFF
  participant API as Backend
  participant J as Job draf
  participant G as Groq LLM
  participant DB as PostgreSQL
  D->>W: Jalankan AI
  W->>API: GET grade/stream
  API->>DB: Cek hak akses, ambil jawaban + rubrik
  API->>J: Mulai atau sambung job
  API-->>W: SSE: menyiapkan
  J->>J: Pecah passage, cari bukti, samarkan
  J->>G: Rubrik + passage (minta JSON)
  alt Batas per menit
    G-->>J: 429 + Retry-After
    J->>G: Ulangi setelah menunggu
  end
  G-->>J: Skor, alasan, kutipan
  J->>J: Verifikasi kutipan, hitung total
  J->>DB: Simpan EvaluationRun
  API-->>W: SSE: draf selesai
  W-->>D: Draf per kriteria
```

## Sequence diagram: rilis nilai

Gambar: `sequence_rilis.png`

```mermaid
sequenceDiagram
  autonumber
  actor D as Dosen
  participant W as Web + BFF
  participant API as Backend
  participant DB as PostgreSQL
  actor M as Mahasiswa
  D->>W: Rilis nilai
  W->>API: POST finalize (versi, skor)
  API->>DB: Cek versi aktif dan rilis lama
  alt Ada perubahan lebih dulu
    API-->>W: 409 konflik
  else Cocok
    API->>API: Hitung ulang total berbobot
    API->>DB: Simpan GradeRevision RELEASED
    API-->>W: 200 dirilis
  end
  M->>API: GET /grades
  API->>DB: Nilai RELEASED milik mahasiswa
  API-->>M: Nilai + umpan balik
  M->>API: Kirim versi baru
  API-->>M: 409 nilai sudah dirilis
```

## ERD: bagian akademik

Gambar: `erd_akademik.png`

```mermaid
erDiagram
  USERS ||--o{ CLASSES : mengampu
  USERS ||--o{ ENROLLMENTS : ikut
  CLASSES ||--o{ ENROLLMENTS : memiliki
  CLASSES ||--o{ RUBRICS : memiliki
  RUBRICS ||--|{ RUBRIC_CRITERIA : terdiri
  CLASSES ||--o{ ASSIGNMENTS : memiliki
  RUBRICS |o--o{ ASSIGNMENTS : dipakai
  USERS {
    string id PK
    string name
    string email UK
    string passwordHash
    enum role
  }
  CLASSES {
    string id PK
    string name
    string subject
    string enrollmentKey UK
    boolean isArchived
    string dosenId FK
  }
  ENROLLMENTS {
    string id PK
    string classId FK
    string mahasiswaId FK
    enum role
  }
  RUBRICS {
    string id PK
    string title
    string classId FK
    string createdById FK
  }
  RUBRIC_CRITERIA {
    string id PK
    string rubricId FK
    string label
    float maxScore
    float weight
    int position
  }
  ASSIGNMENTS {
    string id PK
    string classId FK
    string rubricId FK
    string title
    enum submissionType
    datetime dueDate
    float maxScore
    enum status
  }
```

## ERD: pengumpulan, penilaian, dan dokumen acuan

Gambar: `erd_penilaian.png`

```mermaid
erDiagram
  ASSIGNMENTS ||--o{ SUBMISSIONS : menerima
  USERS ||--o{ SUBMISSIONS : mengirim
  SUBMISSIONS ||--|{ SUBMISSION_VERSIONS : berversi
  SUBMISSION_VERSIONS ||--o{ SUBMISSION_PAGES : halaman_scan
  SUBMISSION_VERSIONS ||--o{ EVALUATION_RUNS : draf_AI
  SUBMISSION_VERSIONS ||--o{ GRADE_REVISIONS : nilai
  EVALUATION_RUNS |o--o{ GRADE_REVISIONS : dasar
  ASSIGNMENTS ||--o{ DOCUMENTS : acuan
  DOCUMENTS ||--|{ DOCUMENT_VERSIONS : berversi
  DOCUMENT_VERSIONS ||--o{ DOCUMENT_CHUNKS : dipotong
  DOCUMENT_CHUNKS ||--o{ CHUNK_EMBEDDINGS : vektor
  SUBMISSIONS {
    string id PK
    string assignmentId FK
    string mahasiswaId FK
    string activeVersionId FK
    string releasedGradeId FK
  }
  SUBMISSION_VERSIONS {
    string id PK
    string submissionId FK
    int versionNumber
    enum type
    text content
    string fileUrl
  }
  EVALUATION_RUNS {
    string id PK
    string versionId FK
    json perCriterionScore
    float suggestedTotalScore
    json evidence
  }
  GRADE_REVISIONS {
    string id PK
    string versionId FK
    string gradedById FK
    float finalScore
    text finalFeedback
    string status
  }
  DOCUMENT_VERSIONS {
    string id PK
    string documentId FK
    string checksum
    enum extractionStatus
  }
```

## Class diagram: model domain

Gambar: `class_domain.png`

```mermaid
---
config:
  flowchart:
    curve: linear
    nodeSpacing: 50
    rankSpacing: 60
---
classDiagram
  direction LR
  class User {
    +String name
    +String email
    +Role role
  }
  class Class {
    +String name
    +String enrollmentKey
    +bool isArchived
  }
  class Rubric {
    +String title
  }
  class RubricCriterion {
    +String label
    +float maxScore
    +float weight
  }
  class Assignment {
    +String title
    +DateTime dueDate
    +AssignmentStatus status
  }
  class Submission {
    +String activeVersionId
    +String releasedGradeId
  }
  class SubmissionVersion {
    +int versionNumber
    +String content
  }
  class EvaluationRun {
    +JSON perCriterionScore
    +float suggestedTotalScore
  }
  class GradeRevision {
    +float finalScore
    +String status
  }
  User "1" --> "*" Class : mengampu
  User "1" --> "*" Submission : mengirim
  Class "1" *-- "*" Assignment
  Class "1" *-- "*" Rubric
  Rubric "1" *-- "1..*" RubricCriterion
  Assignment "*" --> "0..1" Rubric
  Assignment "1" *-- "*" Submission
  Submission "1" *-- "1..*" SubmissionVersion
  SubmissionVersion "1" --> "*" EvaluationRun
  SubmissionVersion "1" --> "*" GradeRevision
```

## Class diagram: layanan pipeline AI

Gambar: `class_layanan.png`

```mermaid
classDiagram
  direction LR
  class GradingJobs {
    +start(submission)
    +get(submission)
    +cancel(submission)
  }
  class EvaluatorService {
    +evaluate_submission()
    +apply_guards()
    +weighted_total()
    +find_manipulation()
  }
  class EvidenceService {
    +split_passages()
    +retrieve_evidence()
  }
  class Anonymizer {
    +anonymize_text()
    +masked_quote_to_regex()
  }
  class LLMClient {
    +chat_json()
    +check_health()
  }
  class EmbeddingService {
    +generate_embeddings_batch()
  }
  class EvaluationRun {
    +perCriterionScore
    +evidence
    +evaluatorConfig
  }
  GradingJobs ..> EvaluatorService : menjalankan
  EvaluatorService ..> EvidenceService
  EvaluatorService ..> Anonymizer
  EvaluatorService ..> LLMClient
  EvidenceService ..> EmbeddingService
  EvaluatorService ..> EvaluationRun : menghasilkan
```
