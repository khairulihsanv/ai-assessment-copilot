/**
 * Central, validated runtime configuration for the RAG pipeline and job system.
 * Read lazily (functions, not constants) so tests can override process.env.
 * Secrets are never logged; see `describeConfigForLogs`.
 */

export const EMBEDDING_DIMENSION = 768; // must equal vector(768) in the DB migration

export type EmbeddingProviderKind = "local" | "openai-compatible" | "stub";
export type LlmProviderKind = "groq" | "stub";

function int(name: string, fallback: number, min = 0): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < min) {
    throw new Error(`Konfigurasi ${name} tidak valid: ${raw}`);
  }
  return n;
}

function stubAllowed(): boolean {
  return process.env.ALLOW_STUB_PROVIDERS === "true";
}

export function embeddingConfig() {
  const kind = (process.env.EMBEDDING_PROVIDER ?? "local") as EmbeddingProviderKind;
  if (!["local", "openai-compatible", "stub"].includes(kind)) {
    throw new Error(`EMBEDDING_PROVIDER tidak dikenal: ${kind}`);
  }
  if (kind === "stub" && !stubAllowed()) {
    throw new Error("EMBEDDING_PROVIDER=stub membutuhkan ALLOW_STUB_PROVIDERS=true (hanya untuk tes/benchmark).");
  }
  // multilingual-e5-base: 768 dim, mendukung Bahasa Indonesia. Prefix e5 wajib ("query: " / "passage: ").
  const model = process.env.EMBEDDING_MODEL ?? "Xenova/multilingual-e5-base";
  return {
    kind,
    model,
    dimension: EMBEDDING_DIMENSION,
    baseUrl: process.env.EMBEDDING_BASE_URL ?? "http://127.0.0.1:11434/v1",
    apiKey: process.env.EMBEDDING_API_KEY ?? "",
    queryPrefix: process.env.EMBEDDING_QUERY_PREFIX ?? "query: ",
    documentPrefix: process.env.EMBEDDING_DOCUMENT_PREFIX ?? "passage: ",
    maxInputTokens: int("EMBEDDING_MAX_INPUT_TOKENS", 480, 16), // di bawah batas 512 model
    batchSize: int("EMBEDDING_BATCH_SIZE", 16, 1),
    timeoutMs: int("EMBEDDING_TIMEOUT_MS", 30000, 1000),
  };
}

export function llmConfig() {
  const kind = (process.env.LLM_PROVIDER ?? "groq") as LlmProviderKind;
  if (!["groq", "stub"].includes(kind)) throw new Error(`LLM_PROVIDER tidak dikenal: ${kind}`);
  if (kind === "stub" && !stubAllowed()) {
    throw new Error("LLM_PROVIDER=stub membutuhkan ALLOW_STUB_PROVIDERS=true (hanya untuk tes/benchmark).");
  }
  return {
    kind,
    model: process.env.GROQ_MODEL ?? "openai/gpt-oss-120b",
    apiKey: process.env.GROQ_API_KEY ?? "",
    baseUrl: process.env.GROQ_BASE_URL ?? "https://api.groq.com/openai/v1",
    temperature: Number(process.env.LLM_TEMPERATURE ?? 0.1),
    maxOutputTokens: int("LLM_MAX_OUTPUT_TOKENS", 4096, 256),
    timeoutMs: int("LLM_TIMEOUT_MS", 60000, 1000),
    // Anggaran token prompt untuk bukti; melebihi ini bukti dikurangi SECARA EKSPLISIT dan dicatat.
    evidenceTokenBudget: int("LLM_EVIDENCE_TOKEN_BUDGET", 6000, 500),
    maxAnswerTokens: int("LLM_MAX_ANSWER_TOKENS", 8000, 500),
  };
}

export function retrievalConfig() {
  return {
    topK: int("RAG_TOP_K", 8, 1),
    minSimilarity: Number(process.env.RAG_MIN_SIMILARITY ?? 0.3),
  };
}

export function queueConfig() {
  return {
    leaseMs: int("JOB_LEASE_MS", 60_000, 1000),
    heartbeatMs: int("JOB_HEARTBEAT_MS", 15_000, 500),
    pollMs: int("JOB_POLL_MS", 1000, 50),
    workerConcurrency: int("WORKER_CONCURRENCY", 4, 1),
    maxRunningPerUser: int("JOB_MAX_RUNNING_PER_USER", 2, 1),
    // Admission control (HTTP 429/503 + Retry-After saat penuh)
    maxQueuedPerUser: int("JOB_MAX_QUEUED_PER_USER", 20, 1),
    maxQueuedGlobal: int("JOB_MAX_QUEUED_GLOBAL", 500, 1),
    maxAttempts: int("JOB_MAX_ATTEMPTS", 3, 1),
  };
}

export function documentLimits() {
  return {
    maxBytes: int("DOC_MAX_BYTES", 20 * 1024 * 1024, 1024),
    maxPages: int("DOC_MAX_PAGES", 300, 1),
    maxExtractedChars: int("DOC_MAX_EXTRACTED_CHARS", 2_000_000, 1000),
    maxZipUncompressedBytes: int("DOC_MAX_ZIP_UNCOMPRESSED_BYTES", 100 * 1024 * 1024, 1024),
    maxZipEntries: int("DOC_MAX_ZIP_ENTRIES", 2000, 1),
    extractTimeoutMs: int("DOC_EXTRACT_TIMEOUT_MS", 60_000, 1000),
  };
}

export function chunkingConfig() {
  return {
    // Dikalibrasi terhadap batas input embedding (480 token) dengan estimator konservatif.
    maxTokens: int("CHUNK_MAX_TOKENS", 400, 50),
    overlapTokens: int("CHUNK_OVERLAP_TOKENS", 50, 0),
  };
}

/** Safe-to-log configuration summary (no secrets). */
export function describeConfigForLogs() {
  const e = embeddingConfig();
  const l = llmConfig();
  return {
    embedding: { kind: e.kind, model: e.model, dimension: e.dimension },
    llm: { kind: l.kind, model: l.model, hasApiKey: Boolean(l.apiKey) },
    queue: queueConfig(),
  };
}
