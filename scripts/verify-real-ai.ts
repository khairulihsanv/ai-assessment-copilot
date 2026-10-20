/**
 * Real AI Verification Suite & API Contract Test Runner
 *
 * Exercises the end-to-end AI pipeline against a dedicated, isolated FastAPI backend.
 *
 * Real AI Verification Requirements:
 * 1. Prerequisite audit (Ollama nomic-embed-text, Groq / Ollama chat LLM).
 * 2. Explicit environment loading without leaking secrets.
 * 3. Isolated FastAPI backend execution on a dynamic port with isolated test DB (ai_assessment_test).
 * 4. Synthetic sample reference document upload via API (POST /reference-documents) using supported PDF format.
 * 5. Awaits background document extraction with a timeout before approval to prevent race conditions.
 * 6. Document approval via API (POST /document-versions/{versionId}/approve) expecting APPROVED status.
 * 7. Database assertion: pgvector chunk_embeddings verified for dimension 768, nomic-embed-text model, and state READY.
 * 8. Synthetic student submission upload via API (POST /submissions).
 * 9. Real AI grading execution via API (POST /submissions/{submissionId}/grade).
 * 10. Strict assertions:
 *     - Provider is REAL (not "mock", not "fallback", isFallback === false).
 *     - Evidence MUST strictly match this run's documentVersionId, with verified content.
 *     - Result DTO adheres strictly to the UI evaluation contract.
 * 11. Guaranteed cleanup in finally block (terminates spawned backend and purges only run fixtures).
 *
 * Separate Contract Mode (--contract-only):
 * Allows validating API endpoints and contract schemas in an isolated test environment when external
 * providers are unavailable, without masquerading as real AI.
 */

import { type ChildProcess, execSync, spawn } from "node:child_process";
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as net from "node:net";
import * as path from "node:path";
import { PrismaClient } from "@prisma/client";
import { config as dotenvConfig } from "dotenv";
import * as jwt from "jsonwebtoken";
import { requireTestDatabaseUrl } from "../apps/frontend/src/server/config/database-url.js";

interface ProviderAudit {
  ollamaOnline: boolean;
  nomicEmbedTextStatus: string;
  nomicEmbedTextAvailable: boolean;
  ollamaModels: string[];
  groqConfigured: boolean;
  groqKeyValid: boolean;
  llmProvider: "groq" | "ollama" | null;
  llmModelName: string;
  unmetPrerequisites: string[];
}

/**
 * Load environment variables explicitly without leaking secrets.
 */
function loadEnvironmentExplicitly(): void {
  const rootEnv = path.resolve(process.cwd(), ".env");
  const localEnv = path.resolve(process.cwd(), ".env.local");
  const backendEnv = path.resolve(process.cwd(), "apps/backend/.env");

  if (fs.existsSync(rootEnv)) {
    dotenvConfig({ path: rootEnv });
  }
  if (fs.existsSync(localEnv)) {
    dotenvConfig({ path: localEnv, override: true });
  }
  if (fs.existsSync(backendEnv)) {
    dotenvConfig({ path: backendEnv });
  }
}

/**
 * Construct a valid minimal PDF buffer containing extractable text.
 * Calculates exact xref byte offsets so pypdf extracts text without warnings.
 */
function createValidPdfBuffer(textContent: string): Buffer {
  const sanitizedText = textContent.replace(/[()\\]/g, "\\$&");
  const streamContent = `BT /F1 12 Tf 50 700 Td (${sanitizedText}) Tj ET`;
  const streamLen = Buffer.byteLength(streamContent, "latin1");

  const header = "%PDF-1.4\n";
  const obj1 = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
  const obj2 = "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n";
  const obj3 =
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n";
  const obj4 = `4 0 obj\n<< /Length ${streamLen} >>\nstream\n${streamContent}\nendstream\nendobj\n`;
  const obj5 = "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n";

  const offset1 = Buffer.byteLength(header, "latin1");
  const offset2 = offset1 + Buffer.byteLength(obj1, "latin1");
  const offset3 = offset2 + Buffer.byteLength(obj2, "latin1");
  const offset4 = offset3 + Buffer.byteLength(obj3, "latin1");
  const offset5 = offset4 + Buffer.byteLength(obj4, "latin1");
  const xrefOffset = offset5 + Buffer.byteLength(obj5, "latin1");

  const pad = (n: number) => String(n).padStart(10, "0");
  const xref = `xref\n0 6\n${pad(0)} 65535 f \n${pad(offset1)} 00000 n \n${pad(offset2)} 00000 n \n${pad(offset3)} 00000 n \n${pad(offset4)} 00000 n \n${pad(offset5)} 00000 n \ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(header + obj1 + obj2 + obj3 + obj4 + obj5 + xref, "latin1");
}

async function isPortInUse(port: number): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(250);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => {
      resolve(false);
    });
    socket.connect(port, "127.0.0.1");
  });
}

async function getFreePort(startingPort = 3025, excludePorts: number[] = []): Promise<number> {
  let port = startingPort;
  while (port < 65535) {
    if (excludePorts.includes(port)) {
      port++;
      continue;
    }
    const busy = await isPortInUse(port);
    if (!busy) return port;
    port++;
  }
  throw new Error("No free port available for isolated backend.");
}

async function isBackendHealthy(port: number): Promise<boolean> {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

function signToken(userId: string, role: string, secret: string): string {
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    {
      sub: userId,
      id: userId,
      role,
      iat: now,
      exp: now + 3600,
      iss: "dexa-backend",
      aud: "dexa-client",
    },
    secret,
    { algorithm: "HS256" },
  );
}

async function auditRealAiProviders(): Promise<ProviderAudit> {
  const audit: ProviderAudit = {
    ollamaOnline: false,
    nomicEmbedTextStatus: "BELUM DIKETAHUI (Ollama daemon offline)",
    nomicEmbedTextAvailable: false,
    ollamaModels: [],
    groqConfigured: false,
    groqKeyValid: false,
    llmProvider: null,
    llmModelName: "",
    unmetPrerequisites: [],
  };

  const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

  // 1. Audit Ollama daemon & nomic-embed-text
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${ollamaBaseUrl}/api/tags`, { signal: controller.signal });
    clearTimeout(timer);

    if (res.ok) {
      audit.ollamaOnline = true;
      const data = (await res.json()) as { models?: Array<{ name: string }> };
      const modelNames = (data.models || []).map((m) => m.name.toLowerCase());
      audit.ollamaModels = modelNames;
      audit.nomicEmbedTextAvailable = modelNames.some((n) => n.includes("nomic-embed-text"));
      audit.nomicEmbedTextStatus = audit.nomicEmbedTextAvailable
        ? "TERSEDIA (nomic-embed-text)"
        : "TIDAK DITEMUKAN (Jalankan 'ollama pull nomic-embed-text')";
    }
  } catch {
    audit.ollamaOnline = false;
    audit.nomicEmbedTextStatus = "BELUM DIKETAHUI (Ollama daemon offline)";
  }

  if (!audit.ollamaOnline) {
    audit.unmetPrerequisites.push(
      `Ollama daemon offline pada ${ollamaBaseUrl}. Embedding riil memerlukan Ollama yang sedang berjalan.`,
    );
  } else if (!audit.nomicEmbedTextAvailable) {
    audit.unmetPrerequisites.push(
      "Model embedding 'nomic-embed-text' belum terpasang di Ollama. Jalankan 'ollama pull nomic-embed-text'.",
    );
  }

  // 2. Audit LLM Provider (Groq or Ollama chat model)
  const groqApiKey = process.env.GROQ_API_KEY || "";
  const isGroqPlaceholder =
    !groqApiKey ||
    groqApiKey === "your-groq-api-key-here" ||
    groqApiKey.startsWith("your-") ||
    groqApiKey.length < 15;

  if (!isGroqPlaceholder) {
    audit.groqConfigured = true;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const res = await fetch("https://api.groq.com/openai/v1/models", {
        headers: { Authorization: `Bearer ${groqApiKey}` },
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.ok) {
        audit.groqKeyValid = true;
        audit.llmProvider = "groq";
        audit.llmModelName = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
      } else {
        audit.unmetPrerequisites.push(
          `Kredensial Groq API ditolak oleh server (HTTP ${res.status}).`,
        );
      }
    } catch {
      audit.unmetPrerequisites.push("Koneksi ke endpoint Groq API mengalami timeout.");
    }
  }

  // If Groq is not available, check for installed Ollama chat LLM
  if (!audit.llmProvider && audit.ollamaOnline) {
    const chatModel = audit.ollamaModels.find(
      (m) =>
        m.includes("llama") || m.includes("mistral") || m.includes("qwen") || m.includes("gemma"),
    );
    if (chatModel) {
      audit.llmProvider = "ollama";
      audit.llmModelName = chatModel;
    }
  }

  if (!audit.llmProvider) {
    audit.unmetPrerequisites.push(
      "Tidak ada LLM penilaian riil yang valid: GROQ_API_KEY belum dikonfigurasi, dan model chat Ollama (seperti llama3) tidak ditemukan.",
    );
  }

  return audit;
}

/**
 * Separate Contract Test implementation.
 * Validates endpoint signatures, approval routes, and payload schemas against the isolated backend.
 * Explicitly disclaims being a real AI test.
 */
async function runContractTest(testDbUrl: string, authSecret: string): Promise<void> {
  console.log("====================================================");
  console.log("             API CONTRACT TEST RUNNER               ");
  console.log("====================================================");
  console.log("⚠️  PEMBERITAHUAN PENTING:");
  console.log("   Pengujian ini HANYA menguji integritas kontrak API dan alur endpoint.");
  console.log("   Pengujian ini BUKAN pengujian AI asli (Real AI Verification).");
  console.log("====================================================\n");

  const backendPort = await getFreePort(3025, [3000, 3001, 3010, 3011, 3012, 3021, 3022]);
  const backendUrl = `http://127.0.0.1:${backendPort}`;
  const pythonBin = process.platform === "win32" ? "python" : "python3";
  let backendProc: ChildProcess | null = null;
  const prisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });

  const runId = `contract-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  const fixtureUserIds: string[] = [];
  let classId = "";
  let assignmentId = "";
  let rubricId = "";
  let docVersionId = "";
  let submissionId = "";

  try {
    backendProc = spawn(
      pythonBin,
      ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", String(backendPort)],
      {
        cwd: path.resolve(process.cwd(), "apps/backend"),
        env: {
          ...process.env,
          PORT: String(backendPort),
          DATABASE_URL: testDbUrl,
          TEST_DATABASE_URL: testDbUrl,
          SECRET_KEY: authSecret,
          INTERNAL_API_SECRET: authSecret,
          JWT_SECRET_KEY: authSecret,
          NODE_ENV: "test",
          ALLOW_STUB_PROVIDERS: "true",
          TEST_MOCK_LLM: "true",
          TEST_MOCK_EMBEDDING: "true",
          PYTHONUNBUFFERED: "1",
        },
        stdio: "inherit",
        shell: false,
      },
    );

    const start = Date.now();
    let healthy = false;
    while (Date.now() - start < 15000) {
      if (await isBackendHealthy(backendPort)) {
        healthy = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 300));
    }
    if (!healthy) {
      throw new Error(`Backend contract test instance failed to start on port ${backendPort}`);
    }

    const dosen = await prisma.user.create({
      data: {
        name: `Dosen Contract (${runId})`,
        email: `dosen-${runId}@dexa.ac.id`,
        passwordHash: "hash",
        role: "DOSEN",
      },
    });
    fixtureUserIds.push(dosen.id);

    const mhs = await prisma.user.create({
      data: {
        name: `Mahasiswa Contract (${runId})`,
        email: `mhs-${runId}@dexa.ac.id`,
        passwordHash: "hash",
        role: "MAHASISWA",
      },
    });
    fixtureUserIds.push(mhs.id);

    const cls = await prisma.class.create({
      data: {
        name: `Kelas Contract ${runId}`,
        enrollmentKey: `KEY-${runId}`,
        dosenId: dosen.id,
      },
    });
    classId = cls.id;

    await prisma.enrollment.create({
      data: { classId: cls.id, userId: mhs.id, role: "STUDENT" },
    });

    const rubric = await prisma.rubric.create({
      data: {
        title: `Rubrik Contract ${runId}`,
        classId: cls.id,
        createdById: dosen.id,
        criteria: {
          create: [
            {
              label: "Pemahaman Algoritma",
              maxScore: 100,
              weight: 100,
              answerKey: "Algoritma quicksort adalah algoritma berbasis divide and conquer.",
              material: "Materi quicksort.",
            },
          ],
        },
      },
    });
    rubricId = rubric.id;

    const assignment = await prisma.assignment.create({
      data: {
        title: `Tugas Contract ${runId}`,
        instructions: "Jelaskan quicksort.",
        dueDate: new Date(Date.now() + 86400000),
        classId: cls.id,
        rubricId: rubric.id,
        status: "PUBLISHED",
      },
    });
    assignmentId = assignment.id;

    const dosenToken = signToken(dosen.id, "DOSEN", authSecret);
    const mhsToken = signToken(mhs.id, "MAHASISWA", authSecret);

    // 1. Upload valid PDF
    console.log("[Contract Test 1/5] Testing reference document upload (multipart PDF)...");
    const sampleDocContent = "Algoritma Quicksort dan Teori Divide-and-Conquer.";
    const pdfBuffer = createValidPdfBuffer(sampleDocContent);
    const boundary = `----WebKitFormBoundary${crypto.randomBytes(8).toString("hex")}`;
    const multipartBody = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="sourceType"\r\n\r\nMATERIAL\r\n` +
          `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="quicksort_reference.pdf"\r\nContent-Type: application/pdf\r\n\r\n`,
      ),
      pdfBuffer,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);

    const uploadRes = await fetch(
      `${backendUrl}/classes/${cls.id}/assignments/${assignment.id}/reference-documents`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${dosenToken}`,
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
        },
        body: multipartBody,
      },
    );
    if (uploadRes.status !== 202) {
      throw new Error(`Upload reference document contract failed with status ${uploadRes.status}`);
    }
    const uploadData = (await uploadRes.json()) as { versionId: string };
    docVersionId = uploadData.versionId;
    console.log(`  ✓ Reference document accepted (HTTP 202, versionId: ${docVersionId}).`);

    // 2. Poll document extraction status
    console.log("[Contract Test 2/5] Testing extraction status polling with timeout...");
    const pollStart = Date.now();
    let isExtracted = false;
    while (Date.now() - pollStart < 15000) {
      const pollRes = await fetch(`${backendUrl}/document-versions/${docVersionId}`, {
        headers: { Authorization: `Bearer ${dosenToken}` },
      });
      if (pollRes.ok) {
        const pollData = (await pollRes.json()) as { extractionStatus: string };
        if (pollData.extractionStatus === "REVIEW_REQUIRED") {
          isExtracted = true;
          break;
        }
      }
      await new Promise((r) => setTimeout(r, 250));
    }
    if (!isExtracted) {
      throw new Error("Timed out waiting for document extraction in contract test.");
    }
    console.log("  ✓ Extraction completed with status REVIEW_REQUIRED.");

    // 3. POST /document-versions/{versionId}/approve
    console.log("[Contract Test 3/5] Testing POST /document-versions/{versionId}/approve...");
    const approveRes = await fetch(`${backendUrl}/document-versions/${docVersionId}/approve`, {
      method: "POST",
      headers: { Authorization: `Bearer ${dosenToken}` },
    });
    if (approveRes.status !== 200) {
      throw new Error(`Approve endpoint contract failed with status ${approveRes.status}`);
    }
    const approveData = (await approveRes.json()) as { status: string };
    if (approveData.status !== "APPROVED") {
      throw new Error(`Expected approve status 'APPROVED', got '${approveData.status}'`);
    }
    console.log("  ✓ Approval endpoint returned status APPROVED.");

    // 4. Verify Database state: documentVersion is APPROVED, chunk_embeddings state is READY
    const docVer = await prisma.documentVersion.findUnique({ where: { id: docVersionId } });
    if (!docVer || docVer.extractionStatus !== "APPROVED") {
      throw new Error(
        `DocumentVersion extractionStatus is '${docVer?.extractionStatus}', expected 'APPROVED'.`,
      );
    }
    const embs = await prisma.chunkEmbedding.findMany({
      where: { documentVersionId: docVersionId },
    });
    for (const emb of embs) {
      if (emb.state !== "READY") {
        throw new Error(`Expected chunkEmbedding state to be READY, got '${emb.state}'.`);
      }
    }
    console.log(
      `  ✓ Database verified: DocumentVersion APPROVED, ${embs.length} chunk embeddings READY.`,
    );

    // 5. Test Submission and Grade Contracts
    console.log("[Contract Test 4/5] Testing submission creation (POST /submissions)...");
    const subRes = await fetch(
      `${backendUrl}/classes/${cls.id}/assignments/${assignment.id}/submissions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${mhsToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: "Quicksort mempartisi array dengan kompleksitas O(n log n).",
        }),
      },
    );
    if (subRes.status !== 201) {
      throw new Error(`Submission contract failed with status ${subRes.status}`);
    }
    const subData = (await subRes.json()) as { submissionId: string };
    submissionId = subData.submissionId;
    console.log("  ✓ Submission created (HTTP 201).");

    console.log(
      "[Contract Test 5/5] Testing evaluation contract (POST /submissions/{id}/grade)...",
    );
    const gradeRes = await fetch(`${backendUrl}/submissions/${submissionId}/grade`, {
      method: "POST",
      headers: { Authorization: `Bearer ${dosenToken}` },
    });
    if (gradeRes.status !== 200) {
      throw new Error(`Grading contract failed with status ${gradeRes.status}`);
    }
    const gradeData = (await gradeRes.json()) as {
      success: boolean;
      aiEvaluation: {
        id: string;
        status: string;
        suggestedTotalScore: number;
        suggestedFeedback: string;
        perCriterionScore: Array<{
          criterionId: string;
          score: number;
          reasoning: string;
        }>;
      };
    };
    if (!gradeData.success || !gradeData.aiEvaluation) {
      throw new Error(
        "Evaluation response DTO contract validation failed: missing success or aiEvaluation.",
      );
    }

    const evalResult = gradeData.aiEvaluation;
    console.log(
      "  • Validating evaluation contract fields (status, numeric score, perCriterionScore, feedback)...",
    );

    // 1. Validate status
    if (typeof evalResult.status !== "string" || !evalResult.status.trim()) {
      throw new Error(`Contract failure: aiEvaluation.status is invalid: '${evalResult.status}'`);
    }
    if (!["COMPLETED", "NEEDS_REVIEW"].includes(evalResult.status)) {
      throw new Error(`Contract failure: unexpected aiEvaluation.status: '${evalResult.status}'`);
    }

    // 2. Validate numeric score
    if (
      typeof evalResult.suggestedTotalScore !== "number" ||
      Number.isNaN(evalResult.suggestedTotalScore)
    ) {
      throw new Error(
        `Contract failure: aiEvaluation.suggestedTotalScore must be a valid number, got: ${evalResult.suggestedTotalScore}`,
      );
    }
    if (evalResult.suggestedTotalScore < 0 || evalResult.suggestedTotalScore > 100) {
      throw new Error(
        `Contract failure: aiEvaluation.suggestedTotalScore out of range [0, 100]: ${evalResult.suggestedTotalScore}`,
      );
    }

    // 3. Validate perCriterionScore array
    if (!Array.isArray(evalResult.perCriterionScore) || evalResult.perCriterionScore.length === 0) {
      throw new Error(
        "Contract failure: aiEvaluation.perCriterionScore must be a non-empty array.",
      );
    }
    for (const item of evalResult.perCriterionScore) {
      if (!item.criterionId || typeof item.criterionId !== "string") {
        throw new Error("Contract failure: perCriterionScore item is missing valid criterionId.");
      }
      if (typeof item.score !== "number" || Number.isNaN(item.score) || item.score < 0) {
        throw new Error(`Contract failure: perCriterionScore item score is invalid: ${item.score}`);
      }
      if (typeof item.reasoning !== "string" || !item.reasoning.trim()) {
        throw new Error("Contract failure: perCriterionScore item reasoning is missing or empty.");
      }
    }

    // 4. Validate feedback
    if (typeof evalResult.suggestedFeedback !== "string" || !evalResult.suggestedFeedback.trim()) {
      throw new Error(
        "Contract failure: aiEvaluation.suggestedFeedback must be a non-empty string.",
      );
    }

    console.log(
      `  ✓ Evaluation contract validated: status=${evalResult.status}, score=${evalResult.suggestedTotalScore}, criteriaCount=${evalResult.perCriterionScore.length}, feedbackLength=${evalResult.suggestedFeedback.length}`,
    );

    console.log("\n====================================================");
    console.log("HASIL PENGUJIAN KONTRAK API: SUKSES (PASS)");
    console.log("Status: KONTRAK ENDPOINT API VALID");
    console.log("CATATAN: Ini adalah pengujian kontrak API, BUKAN pengujian AI asli.");
    console.log("====================================================\n");
  } finally {
    if (backendProc && backendProc.pid) {
      if (process.platform === "win32") {
        try {
          execSync(`taskkill /pid ${backendProc.pid} /T /F`, { stdio: "ignore" });
        } catch {}
      } else {
        try {
          backendProc.kill("SIGTERM");
        } catch {}
      }
    }
    try {
      if (docVersionId) {
        await prisma.chunkEmbedding.deleteMany({ where: { documentVersionId: docVersionId } });
        await prisma.documentChunk.deleteMany({ where: { documentVersionId: docVersionId } });
        await prisma.documentVersion.deleteMany({ where: { id: docVersionId } });
      }
      if (assignmentId) {
        await prisma.document.deleteMany({ where: { assignmentId } });
        if (submissionId) {
          await prisma.evaluationRun.deleteMany({ where: { submissionId } });
          await prisma.gradeRevision.deleteMany({ where: { submissionId } });
          await prisma.submissionVersion.deleteMany({ where: { submissionId } });
          await prisma.submission.deleteMany({ where: { id: submissionId } });
        }
        await prisma.assignment.deleteMany({ where: { id: assignmentId } });
      }
      if (rubricId) {
        await prisma.rubricCriterion.deleteMany({ where: { rubricId } });
        await prisma.rubric.deleteMany({ where: { id: rubricId } });
      }
      if (classId) {
        await prisma.enrollment.deleteMany({ where: { classId } });
        await prisma.class.deleteMany({ where: { id: classId } });
      }
      if (fixtureUserIds.length > 0) {
        await prisma.user.deleteMany({ where: { id: { in: fixtureUserIds } } });
      }
    } catch {}
    await prisma.$disconnect();
  }
}

export async function main() {
  const isContractOnly =
    process.argv.includes("--contract-only") || process.argv.includes("--test-contract");

  // Load environment variables explicitly without printing secrets
  loadEnvironmentExplicitly();

  // 1. Validate isolated test database target (never touch main DB!)
  const rawUrl =
    process.env.TEST_DATABASE_URL ||
    "postgresql://postgres:password@127.0.0.1:5432/ai_assessment_test";
  const testDbUrl = requireTestDatabaseUrl(rawUrl);
  const authSecret =
    process.env.INTERNAL_API_SECRET ||
    process.env.SECRET_KEY ||
    "dexa-assessment-secure-auth-secret-key-32chars-min-2026";

  if (isContractOnly) {
    await runContractTest(testDbUrl, authSecret);
    return;
  }

  console.log("====================================================");
  console.log("       REAL AI PROVIDER VERIFICATION SUITE         ");
  console.log("====================================================");
  console.log("[DB Safety] Target database verified as isolated test database.");

  // 2. Audit real AI providers
  console.log("[Audit] Auditing real external AI services and credentials...");
  const audit = await auditRealAiProviders();

  console.log("\n--- Provider Audit Summary ---");
  console.log(`• Ollama Daemon:            ${audit.ollamaOnline ? "ONLINE" : "OFFLINE"}`);
  console.log(`• nomic-embed-text Model:   ${audit.nomicEmbedTextStatus}`);
  console.log(
    `• Groq API Configuration:   ${
      audit.groqConfigured
        ? audit.groqKeyValid
          ? "VALID"
          : "INVALID KEY"
        : "BELUM DIKONFIGURASI (Placeholder)"
    }`,
  );
  if (audit.llmProvider) {
    console.log(`• Active Real LLM:          ${audit.llmProvider} (${audit.llmModelName})`);
  }
  console.log("------------------------------\n");

  // If prerequisites are unmet, report BLOCKED and halt without faking
  if (audit.unmetPrerequisites.length > 0) {
    console.warn("⚠️  PENGUJIAN AI ASLI TERBLOKIR KARENA PRASYARAT LAYANAN BELUM TERPENUHI:\n");
    for (const item of audit.unmetPrerequisites) {
      console.warn(`  ❌ ${item}`);
    }
    console.warn("\nLangkah yang Diperlukan:");
    console.warn("  1. Aktifkan Ollama: jalankan 'ollama serve'");
    console.warn("  2. Unduh model embedding: jalankan 'ollama pull nomic-embed-text'");
    console.warn(
      "  3. Konfigurasikan Groq di .env: GROQ_API_KEY=gsk_... (atau 'ollama pull llama3')",
    );
    console.warn("\n[HASIL VERIFIKASI]");
    console.warn("Status: TERBLOKIR (BLOCKED) / MENUNGGU LAYANAN EKSTERNAL");
    console.warn(
      "Pengujian mock TIDAK disubstitusikan untuk menjaga keabsahan verifikasi AI asli.",
    );
    console.warn(
      "(Untuk menguji integritas kontrak API secara terpisah, jalankan dengan flag: --contract-only)",
    );
    // Exit with status code indicating blocked prerequisites
    process.exitCode = 1;
    return;
  }

  // 3. Start isolated FastAPI backend with mocks DISABLED and forward audited URLs/models
  console.log("[Setup] Starting isolated FastAPI Backend with MOCKS DISABLED...");
  const backendPort = await getFreePort(3025, [3000, 3001, 3010, 3011, 3012, 3021, 3022]);
  const backendUrl = `http://127.0.0.1:${backendPort}`;

  const pythonBin = process.platform === "win32" ? "python" : "python3";
  let backendProc: ChildProcess | null = null;
  const prisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });

  const runId = `realai-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  const fixtureUserIds: string[] = [];
  let classId = "";
  let assignmentId = "";
  let rubricId = "";
  let docVersionId = "";
  let submissionId = "";

  const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  const groqApiKey = process.env.GROQ_API_KEY || "";

  try {
    backendProc = spawn(
      pythonBin,
      ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", String(backendPort)],
      {
        cwd: path.resolve(process.cwd(), "apps/backend"),
        env: {
          ...process.env,
          PORT: String(backendPort),
          DATABASE_URL: testDbUrl,
          TEST_DATABASE_URL: testDbUrl,
          SECRET_KEY: authSecret,
          INTERNAL_API_SECRET: authSecret,
          JWT_SECRET_KEY: authSecret,
          // CRITICAL: Ensure test mode does NOT activate fallback embedding mock
          NODE_ENV: "production",
          ALLOW_STUB_PROVIDERS: "false",
          TEST_MOCK_LLM: "false",
          TEST_MOCK_EMBEDDING: "false",
          // Forward audited URL and model names to backend
          OLLAMA_BASE_URL: ollamaBaseUrl,
          OLLAMA_MODEL:
            audit.llmProvider === "ollama"
              ? audit.llmModelName
              : process.env.OLLAMA_MODEL || "llama3",
          GROQ_MODEL:
            audit.llmProvider === "groq"
              ? audit.llmModelName
              : process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
          GROQ_BASE_URL: process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1",
          GROQ_API_KEY: groqApiKey,
          LLM_PROVIDER: audit.llmProvider || "groq",
          PYTHONUNBUFFERED: "1",
        },
        stdio: "inherit",
        shell: false,
      },
    );

    // Wait until backend is healthy
    const start = Date.now();
    let healthy = false;
    while (Date.now() - start < 15000) {
      if (await isBackendHealthy(backendPort)) {
        healthy = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 300));
    }
    if (!healthy) {
      throw new Error(`FastAPI backend failed to start on port ${backendPort} within 15s`);
    }
    console.log(`[Setup] FastAPI backend healthy on port ${backendPort}.`);

    // 4. Setup synthetic entities using the REAL Prisma schema
    console.log("[Pipeline 1/6] Initializing synthetic test fixtures...");
    const dosen = await prisma.user.create({
      data: {
        name: `Dosen Real AI (${runId})`,
        email: `dosen-${runId}@dexa.ac.id`,
        passwordHash: "hash",
        role: "DOSEN",
      },
    });
    fixtureUserIds.push(dosen.id);

    const mhs = await prisma.user.create({
      data: {
        name: `Mahasiswa Real AI (${runId})`,
        email: `mhs-${runId}@dexa.ac.id`,
        passwordHash: "hash",
        role: "MAHASISWA",
      },
    });
    fixtureUserIds.push(mhs.id);

    const cls = await prisma.class.create({
      data: {
        name: `Kelas AI Verification ${runId}`,
        enrollmentKey: `KEY-${runId}`,
        dosenId: dosen.id,
      },
    });
    classId = cls.id;

    await prisma.enrollment.create({
      data: {
        classId: cls.id,
        userId: mhs.id,
        role: "STUDENT",
      },
    });

    const rubric = await prisma.rubric.create({
      data: {
        title: `Rubrik Real AI ${runId}`,
        classId: cls.id,
        createdById: dosen.id,
        criteria: {
          create: [
            {
              label: "Pemahaman Kompleksitas Quicksort",
              maxScore: 100,
              weight: 100,
              answerKey:
                "Algoritma quicksort adalah algoritma pengurutan berbasis divide-and-conquer dengan kompleksitas waktu rata-rata O(n log n).",
              material:
                "Materi Kuliah Algoritma: Divide and conquer mempartisi array menjadi submasalah dan menyelesaikannya secara rekursif.",
            },
          ],
        },
      },
    });
    rubricId = rubric.id;

    const assignment = await prisma.assignment.create({
      data: {
        title: `Tugas Sintetis Algoritma ${runId}`,
        instructions: "Jelaskan prinsip kerja dan kompleksitas algoritma quicksort.",
        dueDate: new Date(Date.now() + 86400000),
        classId: cls.id,
        rubricId: rubric.id,
        status: "PUBLISHED",
      },
    });
    assignmentId = assignment.id;

    const dosenToken = signToken(dosen.id, "DOSEN", authSecret);
    const mhsToken = signToken(mhs.id, "MAHASISWA", authSecret);

    // 5. Upload synthetic reference document through FastAPI API using valid PDF format
    console.log(
      "[Pipeline 2/6] Uploading synthetic reference document via API (valid PDF format)...",
    );
    const sampleDocContent =
      "Bab 4: Algoritma Quicksort dan Teori Divide-and-Conquer.\n\n" +
      "Quicksort memilih satu elemen sebagai pivot dan mempartisi array sedemikian rupa sehingga elemen yang lebih kecil " +
      "berada di sebelah kiri dan elemen yang lebih besar berada di sebelah kanan. Pada kasus rata-rata, kompleksitas waktu " +
      "adalah O(n log n). Pivot yang buruk dapat menyebabkan kompleksitas terburuk O(n^2).";

    const pdfBuffer = createValidPdfBuffer(sampleDocContent);
    const boundary = `----WebKitFormBoundary${crypto.randomBytes(8).toString("hex")}`;
    const multipartBody = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="sourceType"\r\n\r\nMATERIAL\r\n` +
          `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="quicksort_reference.pdf"\r\nContent-Type: application/pdf\r\n\r\n`,
      ),
      pdfBuffer,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);

    const uploadRes = await fetch(
      `${backendUrl}/classes/${cls.id}/assignments/${assignment.id}/reference-documents`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${dosenToken}`,
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
        },
        body: multipartBody,
      },
    );

    if (uploadRes.status !== 202) {
      const errText = await uploadRes.text();
      throw new Error(`Upload reference document failed (HTTP ${uploadRes.status}): ${errText}`);
    }
    const uploadData = (await uploadRes.json()) as { versionId: string; documentId: string };
    docVersionId = uploadData.versionId;
    console.log(`  Document uploaded successfully (Version ID: ${docVersionId}).`);

    // Await background parsing to finish before approval to prevent race conditions
    console.log("[Pipeline 2.5/6] Waiting for document background extraction to finish...");
    const pollStart = Date.now();
    const pollTimeoutMs = 15000;
    let extractionCompleted = false;
    let lastExtractionStatus = "UPLOADED";

    while (Date.now() - pollStart < pollTimeoutMs) {
      const pollRes = await fetch(`${backendUrl}/document-versions/${docVersionId}`, {
        headers: { Authorization: `Bearer ${dosenToken}` },
      });
      if (pollRes.ok) {
        const pollData = (await pollRes.json()) as {
          extractionStatus: string;
          errorMessage?: string | null;
        };
        lastExtractionStatus = pollData.extractionStatus;
        if (lastExtractionStatus === "REVIEW_REQUIRED") {
          extractionCompleted = true;
          break;
        }
        if (lastExtractionStatus === "FAILED") {
          throw new Error(
            `Document extraction failed in background task: ${pollData.errorMessage || "Unknown error"}`,
          );
        }
      }
      await new Promise((r) => setTimeout(r, 300));
    }

    if (!extractionCompleted) {
      throw new Error(
        `Timed out waiting for document extraction after ${pollTimeoutMs}ms (current status: '${lastExtractionStatus}')`,
      );
    }
    console.log("  Background extraction complete; document status is REVIEW_REQUIRED.");

    // 6. Approve Document via API -> POST /document-versions/{versionId}/approve (expecting APPROVED)
    console.log(
      "[Pipeline 3/6] Approving document via API (POST /document-versions/{versionId}/approve)...",
    );
    const approveRes = await fetch(`${backendUrl}/document-versions/${docVersionId}/approve`, {
      method: "POST",
      headers: { Authorization: `Bearer ${dosenToken}` },
    });

    if (approveRes.status !== 200) {
      const errText = await approveRes.text();
      throw new Error(`Approval endpoint failed (HTTP ${approveRes.status}): ${errText}`);
    }
    const approveData = (await approveRes.json()) as {
      success: boolean;
      status: string;
      chunksIndexed: number;
      indexingPending: boolean;
    };
    if (approveData.status !== "APPROVED") {
      throw new Error(
        `Expected document status to be 'APPROVED', received '${approveData.status}'`,
      );
    }
    console.log(
      `  Document approved successfully (Status: APPROVED, Chunks indexed: ${approveData.chunksIndexed}).`,
    );

    // 7. Verify chunk_embeddings in Database
    console.log("[Pipeline 4/6] Verifying chunk_embeddings in PostgreSQL pgvector...");
    const docVer = await prisma.documentVersion.findUnique({
      where: { id: docVersionId },
    });
    if (!docVer || docVer.extractionStatus !== "APPROVED") {
      throw new Error(
        `Assertion failed: DocumentVersion extractionStatus is '${docVer?.extractionStatus}', expected 'APPROVED'.`,
      );
    }

    const chunks = await prisma.documentChunk.findMany({
      where: { documentVersionId: docVersionId },
      include: { embeddings: true },
    });
    if (chunks.length === 0) {
      throw new Error("Assertion failed: No document chunks were created.");
    }
    const storedEmbeddings = chunks.flatMap((c) => c.embeddings);
    if (storedEmbeddings.length === 0) {
      throw new Error("Assertion failed: No chunk embeddings found in pgvector table.");
    }
    for (const emb of storedEmbeddings) {
      if (emb.dimension !== 768) {
        throw new Error(`Assertion failed: Embedding dimension is ${emb.dimension}, expected 768.`);
      }
      if (emb.model !== "nomic-embed-text") {
        throw new Error(
          `Assertion failed: Embedding model is '${emb.model}', expected 'nomic-embed-text'.`,
        );
      }
      if (emb.state !== "READY") {
        throw new Error(`Assertion failed: Embedding state is '${emb.state}', expected 'READY'.`);
      }
    }
    console.log(
      `  Verified ${storedEmbeddings.length} pgvector embeddings (dim: 768, model: nomic-embed-text, state: READY).`,
    );

    // 8. Submit student answer via API
    console.log("[Pipeline 5/6] Submitting synthetic student answer via API...");
    const subRes = await fetch(
      `${backendUrl}/classes/${cls.id}/assignments/${assignment.id}/submissions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${mhsToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content:
            "Algoritma quicksort membagi array menggunakan pivot dengan pendekatan divide and conquer. " +
            "Kompleksitas waktu rata-rata algoritma ini adalah O(n log n).",
        }),
      },
    );
    if (subRes.status !== 201) {
      const errText = await subRes.text();
      throw new Error(`Submission failed (HTTP ${subRes.status}): ${errText}`);
    }
    const subData = (await subRes.json()) as { submissionId: string };
    submissionId = subData.submissionId;

    // 9. Execute Real AI Evaluation
    console.log("[Pipeline 6/6] Requesting Real AI Evaluation & Evidence Retrieval via API...");
    const gradeRes = await fetch(`${backendUrl}/submissions/${submissionId}/grade`, {
      method: "POST",
      headers: { Authorization: `Bearer ${dosenToken}` },
    });
    if (gradeRes.status !== 200) {
      const errText = await gradeRes.text();
      throw new Error(`Grading request failed (HTTP ${gradeRes.status}): ${errText}`);
    }
    const gradeData = (await gradeRes.json()) as {
      success: boolean;
      aiEvaluation: {
        id: string;
        status: string;
        suggestedTotalScore: number;
        suggestedFeedback: string;
        perCriterionScore: Array<{ criterionId: string; score: number; reasoning: string }>;
        evidence: Array<{ documentVersionId: string; text: string; similarity?: number }>;
        evaluatorConfig: {
          provider: string;
          model: string;
          evidenceBlockCount: number;
          isFallback: boolean;
        };
      };
    };

    const evalResult = gradeData.aiEvaluation;
    console.log("\n--- Verification Assertions ---");

    // Assertion A: Provider must be REAL
    const config = evalResult.evaluatorConfig;
    console.log(`• Evaluator Provider:       ${config.provider} (Model: ${config.model})`);
    if (config.provider === "mock") {
      throw new Error(
        "Assertion failed: Evaluation was processed by mock provider instead of real AI!",
      );
    }
    if (config.provider === "fallback" || config.isFallback) {
      throw new Error("Assertion failed: Evaluation was processed by heuristic fallback!");
    }
    if (!["groq", "ollama"].includes(config.provider)) {
      throw new Error(`Assertion failed: Unexpected provider '${config.provider}'!`);
    }
    console.log("  ✓ Confirmed provider is authentic external AI (not mock/fallback).");

    // Assertion B: Evidence retrieved must strictly match this run's documentVersionId
    console.log(`• Evidence Blocks Count:    ${evalResult.evidence?.length || 0}`);
    if (!evalResult.evidence || evalResult.evidence.length === 0) {
      throw new Error("Assertion failed: No evidence retrieved from reference document!");
    }

    const matchedEvidences = evalResult.evidence.filter(
      (e) => e.documentVersionId === docVersionId,
    );
    if (matchedEvidences.length === 0) {
      throw new Error(
        `Assertion failed: Retrieved evidence does not match this run's documentVersionId ('${docVersionId}')!`,
      );
    }

    // Validate evidence text content
    for (const ev of matchedEvidences) {
      if (!ev.text || typeof ev.text !== "string" || ev.text.trim().length === 0) {
        throw new Error("Assertion failed: Evidence block text is empty.");
      }
      const lower = ev.text.toLowerCase();
      if (!lower.includes("quicksort") && !lower.includes("divide") && !lower.includes("pivot")) {
        throw new Error(
          `Assertion failed: Evidence text does not contain expected domain concepts: '${ev.text}'`,
        );
      }
    }
    console.log(
      `  ✓ Confirmed ${matchedEvidences.length} evidence block(s) strictly match documentVersionId '${docVersionId}' with valid content.`,
    );

    // Assertion C: UI Result Contract Compliance
    if (typeof evalResult.suggestedTotalScore !== "number" || evalResult.suggestedTotalScore < 0) {
      throw new Error(`Assertion failed: Invalid total score ${evalResult.suggestedTotalScore}`);
    }
    if (!Array.isArray(evalResult.perCriterionScore) || evalResult.perCriterionScore.length === 0) {
      throw new Error("Assertion failed: perCriterionScore array is empty or invalid.");
    }
    if (!evalResult.suggestedFeedback || typeof evalResult.suggestedFeedback !== "string") {
      throw new Error("Assertion failed: suggestedFeedback is missing or invalid.");
    }
    if (evalResult.status !== "COMPLETED") {
      throw new Error(`Assertion failed: Expected status COMPLETED, got ${evalResult.status}`);
    }
    console.log(
      `• Final Evaluated Score:    ${evalResult.suggestedTotalScore} / 100 (Status: ${evalResult.status})`,
    );
    console.log("  ✓ Result DTO matches UI contracts and schema requirements.");
    console.log("-------------------------------\n");

    console.log(
      "🎉 REAL AI VERIFICATION SUCCESSFUL: Full pipeline validated with authentic provider!",
    );
  } finally {
    console.log("[Teardown] Cleaning up real AI fixtures and stopping isolated FastAPI backend...");

    // Terminate spawned backend process
    if (backendProc && backendProc.pid) {
      if (process.platform === "win32") {
        try {
          execSync(`taskkill /pid ${backendProc.pid} /T /F`, { stdio: "ignore" });
        } catch {}
      } else {
        try {
          backendProc.kill("SIGTERM");
        } catch {}
      }
    }

    // Purge only run-specific fixtures (main DB remains completely untouched)
    try {
      if (docVersionId) {
        await prisma.chunkEmbedding.deleteMany({ where: { documentVersionId: docVersionId } });
        await prisma.documentChunk.deleteMany({ where: { documentVersionId: docVersionId } });
        await prisma.documentVersion.deleteMany({ where: { id: docVersionId } });
      }
      if (assignmentId) {
        await prisma.document.deleteMany({ where: { assignmentId } });
        if (submissionId) {
          await prisma.evaluationRun.deleteMany({ where: { submissionId } });
          await prisma.gradeRevision.deleteMany({ where: { submissionId } });
          await prisma.submissionVersion.deleteMany({ where: { submissionId } });
          await prisma.submission.deleteMany({ where: { id: submissionId } });
        }
        await prisma.assignment.deleteMany({ where: { id: assignmentId } });
      }
      if (rubricId) {
        await prisma.rubricCriterion.deleteMany({ where: { rubricId } });
        await prisma.rubric.deleteMany({ where: { id: rubricId } });
      }
      if (classId) {
        await prisma.enrollment.deleteMany({ where: { classId } });
        await prisma.class.deleteMany({ where: { id: classId } });
      }
      if (fixtureUserIds.length > 0) {
        await prisma.user.deleteMany({ where: { id: { in: fixtureUserIds } } });
      }
    } catch (cleanupErr) {
      console.warn("[Teardown Warning] Fixture cleanup encountered an error:", cleanupErr);
    } finally {
      await prisma.$disconnect();
    }
  }
}

if (process.argv[1]?.includes("verify-real-ai")) {
  main().catch((err) => {
    console.error("Verification execution error:", err);
    process.exit(1);
  });
}
