# Matriks Traceability Dexa Assessment

> Bukti tambahan 2 Oktober 2026: 31 tes unit/parser, 12 tes integrasi PostgreSQL 15, build, serta kesesuaian schema hasil migrasi lulus secara lokal. Cakupan ini belum memverifikasi semua acceptance criteria FR14/DX16/NFR01 atau seluruh Paket B/C, sehingga status requirement tidak dinaikkan otomatis. Rincian dan gap aktual ada di [laporan perbaikan Codex](04-codex-fixes-2026-10-02.md).

| ID | Sumber/Bagian PRD | Fase | Lokasi Kode | Gap/Bukti | Acceptance/Test | Status | Blocker |
|---|---|---|---|---|---|---|---|
| **FR1** | 7. Registry FR | R2 |  | | `AT-FR1` | NOT_STARTED | |
| **FR2** | 7. Registry FR | R0 | `prisma/schema.prisma` | Relasi GradeRevision, SubmissionVersion | `AT-FR2` | IMPLEMENTED_UNVERIFIED | Tes integrasi db |
| **FR3** | 7. Registry FR | R2 |  | | `AT-FR3` | NOT_STARTED | |
| **FR4** | 7. Registry FR | R2 |  | | `AT-FR4` | NOT_STARTED | |
| **FR5** | 7. Registry FR | R2 | `stream/route.ts` | Streaming via SSE | `AT-FR5` | IMPLEMENTED_UNVERIFIED | UI memproses per step |
| **FR6a** | 7. Registry FR | R0 | `prisma/schema.prisma` | Relasi GradeRevision, history audit | `AT-FR6a` | IMPLEMENTED_UNVERIFIED | Perlu tes konflik tab |
| **FR6b** | 7. Registry FR | R2 |  | | `AT-FR6b` | NOT_STARTED | |
| **FR7a** | 7. Registry FR | R2 |  | | `AT-FR7a` | NOT_STARTED | |
| **FR7b** | 7. Registry FR | R2 |  | | `AT-FR7b` | NOT_STARTED | |
| **FR8** | 7. Registry FR | R2 | `stream/route.ts` | Server failure mengembalikan HTTP/SSE error msg | `AT-FR8` | IMPLEMENTED_UNVERIFIED | |
| **FR9** | 7. Registry FR | R2 | `stream/route.ts` | AbortController signal check sebelum DB | `AT-FR9` | IMPLEMENTED_UNVERIFIED | |
| **FR10** | 7. Registry FR | R2 |  | | `AT-FR10` | NOT_STARTED | |
| **FR11** | 7. Registry FR | R2 |  | | `AT-FR11` | NOT_STARTED | |
| **FR12** | 7. Registry FR | R1 |  | | `AT-FR12` | NOT_STARTED | |
| **FR13** | 7. Registry FR | R0 |  | | `AT-FR13` | NOT_STARTED | |
| **FR14** | 7. Registry FR | R0 | `prisma/schema.prisma` | DB role ditambahkan | `AT-FR14` | IMPLEMENTED_UNVERIFIED | Tes handler mock; DB terisolasi butuh setup |
| **FR15** | 7. Registry FR | R2 |  | | `AT-FR15` | NOT_STARTED | |
| **FR16** | 7. Registry FR | R1 |  | | `AT-FR16` | NOT_STARTED | |
| **FR17** | 7. Registry FR | R2 |  | | `AT-FR17` | NOT_STARTED | |
| **FR18** | 7. Registry FR | R2 |  | | `AT-FR18` | NOT_STARTED | |
| **FR19** | 7. Registry FR | R1 | `prisma/schema.prisma` | Pointer activeVersionId, EvaluationRun relasi | `AT-FR19` | IMPLEMENTED_UNVERIFIED | Perlu UI untuk switch versi |
| **FR20** | 7. Registry FR | R2 |  | | `AT-FR20` | NOT_STARTED | |
| **FR21** | 7. Registry FR | R2 |  | | `AT-FR21` | NOT_STARTED | |
| **FR22** | 7. Registry FR | R2 | `ai-review-panel.tsx` | UI 3 kolom dengan panel Acuan | `AT-FR22` | IMPLEMENTED_UNVERIFIED | Perlu dummy data RAG |
| **FR23** | 7. Registry FR | R2 |  | | `AT-FR23` | NOT_STARTED | |
| **FR24** | 7. Registry FR | R2 |  | | `AT-FR24` | NOT_STARTED | |
| **DX01** | 8. Registry DX | R1 | `reference-documents/route.ts` | Upload acuan TXT/PDF | `AT-DX01` | IMPLEMENTED_UNVERIFIED | |
| **DX02** | 8. Registry DX | R1 | `prisma/schema.prisma` | DocumentVersion objectKey, checksum | `AT-DX02` | IMPLEMENTED_UNVERIFIED | |
| **DX03** | 8. Registry DX | R1 | `document-parser.ts` | Ekstraksi PDF & TXT dengan pdf-parse | `AT-DX03` | IMPLEMENTED_UNVERIFIED | Error handling tersedia |
| **DX04** | 8. Registry DX | R1 |  | | `AT-DX04` | NOT_STARTED | |
| **DX05** | 8. Registry DX | R1 |  | | `AT-DX05` | NOT_STARTED | |
| **DX06** | 8. Registry DX | R1 |  | | `AT-DX06` | NOT_STARTED | |
| **DX07** | 8. Registry DX | R1 |  | | `AT-DX07` | NOT_STARTED | |
| **DX08** | 8. Registry DX | R1 | `document-parser.ts` | DocumentChunk locator, naive chunk | `AT-DX08` | IMPLEMENTED_UNVERIFIED | Chunking masih naive paragraph |
| **DX09** | 8. Registry DX | R1 | `prisma/schema.prisma` | ChunkEmbedding model index model | `AT-DX09` | IMPLEMENTED_UNVERIFIED | Native pgvector blm dicoba, json ops |
| **DX10** | 8. Registry DX | R1 | `prisma/schema.prisma` | ReferenceSetVersion untuk otorisasi scope | `AT-DX10` | IMPLEMENTED_UNVERIFIED | Retrieval RAG blm dibuat |
| **DX11** | 8. Registry DX | R1 | `grading-client.ts` | response_format: json_object Zod schema | `AT-DX11` | IMPLEMENTED_UNVERIFIED | |
| **DX12** | 8. Registry DX | R1 | `grading-client.ts` | Prompt konteks menerima submission, instructions, maxScore | `AT-DX12` | IMPLEMENTED_UNVERIFIED | |
| **DX13** | 8. Registry DX | R1 | `grading-client.ts` | Security Guardrails prompt | `AT-DX13` | IMPLEMENTED_UNVERIFIED | |
| **DX14** | 8. Registry DX | R1 | `app/api/...` | validasi nilai, pointer releasedGradeId | `AT-DX14` | IMPLEMENTED_UNVERIFIED | Tes manual dosen rilis nilai |
| **DX15** | 8. Registry DX | R1 | `grading-client.ts` | Fetch abort dan 3x retry timeout 60s | `AT-DX15` | IMPLEMENTED_UNVERIFIED | |
| **DX16** | 8. Registry DX | R1 | `app/api/...` | Payload API di-sanitize | `AT-DX16` | IMPLEMENTED_UNVERIFIED | Tes integrasi rute penuh blm ada |
| **DX17** | 8. Registry DX | R1 | `prisma/schema.prisma` | SubmissionVersion model append-only | `AT-DX17` | IMPLEMENTED_UNVERIFIED | |
| **DX18** | 8. Registry DX | R1 | `ai-review-panel.tsx` | Panel Acuan pada UI Studio Koreksi | `AT-DX18` | IMPLEMENTED_UNVERIFIED | |
| **DX19** | 8. Registry DX | R1 |  | | `AT-DX19` | NOT_STARTED | |
| **DX20** | 8. Registry DX | R1 |  | | `AT-DX20` | NOT_STARTED | |
| **DX21** | 8. Registry DX | R1 |  | | `AT-DX21` | NOT_STARTED | |
| **DX22** | 8. Registry DX | R1 |  | | `AT-DX22` | NOT_STARTED | |
| **EXT01** | 9. Komitmen tambahan | R2/R3 |  | | `AT-EXT01` | NOT_STARTED | |
| **EXT02** | 9. Komitmen tambahan | R2/R3 |  | | `AT-EXT02` | NOT_STARTED | |
| **EXT03** | 9. Komitmen tambahan | R2/R3 |  | | `AT-EXT03` | NOT_STARTED | |
| **EXT04** | 9. Komitmen tambahan | R2/R3 |  | | `AT-EXT04` | NOT_STARTED | |
| **EXT05** | 9. Komitmen tambahan | R2/R3 |  | | `AT-EXT05` | NOT_STARTED | |
| **EXT06** | 9. Komitmen tambahan | R2/R3 |  | | `AT-EXT06` | NOT_STARTED | |
| **EXT07** | 9. Komitmen tambahan | R2/R3 |  | | `AT-EXT07` | NOT_STARTED | |
| **EXT08** | 9. Komitmen tambahan | R2/R3 |  | | `AT-EXT08` | NOT_STARTED | |
| **EXT09** | 9. Komitmen tambahan | R2/R3 |  | | `AT-EXT09` | NOT_STARTED | |
| **EXT10** | 9. Komitmen tambahan | R2/R3 |  | | `AT-EXT10` | NOT_STARTED | |
| **EXT11** | 9. Komitmen tambahan | R2/R3 |  | | `AT-EXT11` | NOT_STARTED | |
| **EXT12** | 9. Komitmen tambahan | R2/R3 |  | | `AT-EXT12` | NOT_STARTED | |
| **EXT13** | 9. Komitmen tambahan | R2/R3 |  | | `AT-EXT13` | NOT_STARTED | |
| **NFR01** | 16. Persyaratan nonfungsional | R2 | `app/api/...` | RBAC & Authorization via `isPrivileged` | `AT-NFR01` | IMPLEMENTED_UNVERIFIED | Tes integrasi penuh & RSC blm tervalidasi |
| **NFR02** | 16. Persyaratan nonfungsional | R2 |  | | `AT-NFR02` | NOT_STARTED | |
| **NFR03** | 16. Persyaratan nonfungsional | R2 |  | | `AT-NFR03` | NOT_STARTED | |
| **NFR04** | 16. Persyaratan nonfungsional | R2 |  | | `AT-NFR04` | NOT_STARTED | |
| **NFR05** | 16. Persyaratan nonfungsional | R2 |  | | `AT-NFR05` | NOT_STARTED | |
| **NFR06** | 16. Persyaratan nonfungsional | R2 |  | | `AT-NFR06` | NOT_STARTED | |
| **NFR07** | 16. Persyaratan nonfungsional | R2 |  | | `AT-NFR07` | NOT_STARTED | |
| **NFR08** | 16. Persyaratan nonfungsional | R2 |  | | `AT-NFR08` | NOT_STARTED | |
| **NFR09** | 16. Persyaratan nonfungsional | R2 |  | | `AT-NFR09` | NOT_STARTED | |
| **NFR10** | 16. Persyaratan nonfungsional | R2 |  | | `AT-NFR10` | NOT_STARTED | |
| **NFR11** | 16. Persyaratan nonfungsional | R2 |  | | `AT-NFR11` | NOT_STARTED | |
| **NFR12** | 16. Persyaratan nonfungsional | R2 |  | | `AT-NFR12` | NOT_STARTED | |
| **NFR13** | 16. Persyaratan nonfungsional | R2 |  | | `AT-NFR13` | NOT_STARTED | |
| **NFR14** | 16. Persyaratan nonfungsional | R2 |  | | `AT-NFR14` | NOT_STARTED | |
| **NFR15** | 16. Persyaratan nonfungsional | R2 |  | | `AT-NFR15` | NOT_STARTED | |
| **NFR16** | 16. Persyaratan nonfungsional | R2 |  | | `AT-NFR16` | NOT_STARTED | |
