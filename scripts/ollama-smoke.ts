/**
 * Smoke test for local Ollama using synthetic fixture and contracts schema.
 *
 * Evaluates real Ollama generation, records performance metrics,
 * enforces strict schema validation using parseStructuredLLMOutput,
 * and separates transport, schema, and content validation.
 */

import {
  parseStructuredLLMOutput,
  type SmokeEvaluation,
  smokeEvaluationSchema,
} from "@dexa/contracts";

export interface OllamaSmokeResult {
  overallSuccess: boolean;
  transportSuccess: boolean;
  schemaSuccess: boolean;
  contentValid: boolean;
  model: string;
  durationMs: number;
  doneReason?: string;
  promptTokens?: number;
  responseTokens?: number;
  rawResponse?: string;
  parsedResponse?: SmokeEvaluation | null;
  error?: string;
}

export async function runOllamaSmokeTest(): Promise<OllamaSmokeResult> {
  const model = "qwen3:4b";
  const endpoint = "http://127.0.0.1:11434/api/generate";
  const timeoutMs = 60000;

  const syntheticPrompt = `Anda adalah asisten penilai akademik.
Evaluasi jawaban mahasiswa berikut:
"Sistem web assessment memiliki aktor Dosen dan Mahasiswa. Kebutuhan fungsional mencakup pembuatan kelas, pengumpulan tugas, dan evaluasi nilai otomatis."

Berikan penilaian dalam format JSON:
{
  "score": 85,
  "feedback": "Penjelasan mencakup aktor dan kebutuhan fungsional utama."
}
HANYA kembalikan JSON valid.`;

  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        prompt: syntheticPrompt,
        stream: false,
        format: "json",
        think: false, // Nonaktifkan mode thinking pada model reasoning Ollama
        options: {
          num_predict: 120,
          temperature: 0.1,
        },
      }),
    });

    clearTimeout(timeoutId);
    const durationMs = Date.now() - startTime;

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return {
        overallSuccess: false,
        transportSuccess: false,
        schemaSuccess: false,
        contentValid: false,
        model,
        durationMs,
        error: `Ollama returned HTTP ${res.status}: ${errText}`,
      };
    }

    const data = (await res.json()) as any;
    const rawResponse = data.response?.trim() || "";
    const doneReason = data.done_reason || (data.done ? "stop" : "unknown");

    // Jika Ollama mengembalikan response kosong karena batas token / thinking
    if (!rawResponse) {
      return {
        overallSuccess: false,
        transportSuccess: true,
        schemaSuccess: false,
        contentValid: false,
        model,
        durationMs,
        doneReason,
        promptTokens: data.prompt_eval_count,
        responseTokens: data.eval_count,
        rawResponse: "",
        parsedResponse: null,
        error: `Output kosong dari Ollama (done_reason: ${doneReason}, thinking_length: ${data.thinking?.length || 0})`,
      };
    }

    // Uji menggunakan parser yang sama dengan jalur grading aplikasi (@dexa/contracts)
    const parseResult = parseStructuredLLMOutput(rawResponse, smokeEvaluationSchema);

    if (!parseResult.success || !parseResult.data) {
      return {
        overallSuccess: false,
        transportSuccess: true,
        schemaSuccess: false,
        contentValid: false,
        model,
        durationMs,
        doneReason,
        promptTokens: data.prompt_eval_count,
        responseTokens: data.eval_count,
        rawResponse,
        parsedResponse: null,
        error: parseResult.error || "Gagal memvalidasi skema JSON",
      };
    }

    const evalData = parseResult.data;
    const isContentValid =
      typeof evalData.score === "number" &&
      evalData.score >= 0 &&
      evalData.score <= 100 &&
      typeof evalData.feedback === "string" &&
      evalData.feedback.trim().length > 0;

    return {
      overallSuccess: isContentValid,
      transportSuccess: true,
      schemaSuccess: true,
      contentValid: isContentValid,
      model,
      durationMs,
      doneReason,
      promptTokens: data.prompt_eval_count,
      responseTokens: data.eval_count,
      rawResponse,
      parsedResponse: evalData,
      error: isContentValid ? undefined : "Konten hasil evaluasi tidak memenuhi syarat validitas",
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const durationMs = Date.now() - startTime;
    const isAbort = err instanceof Error && err.name === "AbortError";
    return {
      overallSuccess: false,
      transportSuccess: false,
      schemaSuccess: false,
      contentValid: false,
      model,
      durationMs,
      error: isAbort
        ? `Request timeout setelah ${timeoutMs}ms`
        : err instanceof Error
          ? err.message
          : String(err),
    };
  }
}

// Standalone execution
if (process.argv[1] && process.argv[1].includes("ollama-smoke")) {
  console.log("[ollama-smoke] Starting local Ollama smoke test...");
  runOllamaSmokeTest().then((result) => {
    console.log("[ollama-smoke] Result:", JSON.stringify(result, null, 2));
    if (!result.overallSuccess) {
      process.exit(1);
    }
    process.exit(0);
  });
}
