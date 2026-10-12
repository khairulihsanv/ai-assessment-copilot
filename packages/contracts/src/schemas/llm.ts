import { z } from "zod";

// ─── 1. Contract for Academic Grading (Production / End-to-End) ─── //

export const perCriterionScoreSchema = z.object({
  criterionId: z.string().min(1, "criterionId wajib diisi"),
  score: z.number().min(0, "Skor kriteria tidak boleh negatif"),
  reasoning: z.string().min(1, "Alasan evaluasi kriteria wajib diisi"),
  similarityScore: z.number().min(0).max(100).optional(),
  classification: z.string().optional(),
});

export const gradingResponseSchema = z.object({
  perCriterion: z
    .array(perCriterionScoreSchema)
    .min(1, "Minimal satu kriteria evaluasi harus disertakan"),
  suggestedTotalScore: z.number().min(0, "Total skor tidak boleh negatif"),
  suggestedFeedback: z.string().min(1, "Umpan balik evaluasi wajib diisi"),
});

export type GradingResponse = z.infer<typeof gradingResponseSchema>;
export type PerCriterionScore = z.infer<typeof perCriterionScoreSchema>;

// ─── 2. Contract for Synthetic Smoke Test ─── //

export const smokeEvaluationSchema = z.object({
  score: z.number().min(0, "Skor minimal 0").max(100, "Skor maksimal 100"),
  feedback: z.string().min(1, "Umpan balik tidak boleh kosong"),
});

export type SmokeEvaluation = z.infer<typeof smokeEvaluationSchema>;

// ─── 3. Deterministic & Safe LLM Output Parser ─── //

export function extractJsonCandidate(raw: string): string | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // 1. Ekstraksi dari markdown code fence ```json ... ``` atau ``` ... ```
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    const candidate = codeBlockMatch[1].trim();
    if (
      (candidate.startsWith("{") && candidate.endsWith("}")) ||
      (candidate.startsWith("[") && candidate.endsWith("]"))
    ) {
      return candidate;
    }
  }

  // 2. Format JSON langsung (objek atau array utuh)
  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    return trimmed;
  }

  // 3. Fallback: Ekstraksi kurung kurawal terluar dari teks percakapan
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1).trim();
  }

  return null;
}

export interface LLMParseResult<T> {
  success: boolean;
  data?: T;
  rawExtracted?: string;
  error?: string;
  phase?: "EXTRACTION" | "SYNTAX" | "VALIDATION";
}

export function parseStructuredLLMOutput<T>(raw: string, schema: z.ZodType<T>): LLMParseResult<T> {
  const candidate = extractJsonCandidate(raw);
  if (!candidate) {
    return {
      success: false,
      error: "Tidak dapat mengekstraksi blok JSON dari respons model",
      phase: "EXTRACTION",
    };
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(candidate);
  } catch (err) {
    return {
      success: false,
      rawExtracted: candidate,
      error: `Sintaks JSON tidak valid atau output terpotong: ${
        err instanceof Error ? err.message : String(err)
      }`,
      phase: "SYNTAX",
    };
  }

  const validation = schema.safeParse(parsedJson);
  if (!validation.success) {
    const issues = validation.error.issues
      .map((i) => `${i.path.join(".") || "root"}: ${i.message}`)
      .join("; ");
    return {
      success: false,
      rawExtracted: candidate,
      error: `Validasi skema gagal: ${issues}`,
      phase: "VALIDATION",
    };
  }

  return {
    success: true,
    data: validation.data,
    rawExtracted: candidate,
  };
}
