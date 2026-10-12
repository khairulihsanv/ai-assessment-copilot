import {
  gradingResponseSchema,
  parseStructuredLLMOutput,
  smokeEvaluationSchema,
} from "@dexa/contracts";
import { describe, expect, it } from "vitest";

describe("LLM Structured Output Parser & Validator", () => {
  // 1. JSON Valid (Pure JSON)
  it("1. accepts valid pure JSON conforming to schema", () => {
    const raw = JSON.stringify({
      score: 85,
      feedback: "Jawaban komprehensif dan sesuai kebutuhan fungsional sistem.",
    });

    const result = parseStructuredLLMOutput(raw, smokeEvaluationSchema);
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      score: 85,
      feedback: "Jawaban komprehensif dan sesuai kebutuhan fungsional sistem.",
    });
    expect(result.error).toBeUndefined();
  });

  // 2. Code Fence (Markdown ```json ... ``` dan ``` ... ```)
  it("2. correctly extracts JSON enclosed in markdown code fences (with/without json tag)", () => {
    const withTag = `Berikut hasil asesmen:\n\`\`\`json\n{\n  "score": 90,\n  "feedback": "Penjelasan sangat detail."\n}\n\`\`\`\nSemoga membantu.`;
    const res1 = parseStructuredLLMOutput(withTag, smokeEvaluationSchema);
    expect(res1.success).toBe(true);
    expect(res1.data?.score).toBe(90);

    const withoutTag = `\`\`\`\n{\n  "score": 75,\n  "feedback": "Cukup baik."\n}\n\`\`\``;
    const res2 = parseStructuredLLMOutput(withoutTag, smokeEvaluationSchema);
    expect(res2.success).toBe(true);
    expect(res2.data?.score).toBe(75);
  });

  // 3. Field Wajib Hilang (Missing required fields)
  it("3. rejects output with missing required fields", () => {
    const raw = JSON.stringify({
      // missing 'feedback'
      score: 80,
    });

    const result = parseStructuredLLMOutput(raw, smokeEvaluationSchema);
    expect(result.success).toBe(false);
    expect(result.phase).toBe("VALIDATION");
    expect(result.error).toContain("feedback");
    expect(result.data).toBeUndefined();
  });

  // 4. Salah Tipe (Wrong data type)
  it("4. rejects output with wrong field types", () => {
    const raw = JSON.stringify({
      score: "delapan puluh", // should be number
      feedback: "Baik",
    });

    const result = parseStructuredLLMOutput(raw, smokeEvaluationSchema);
    expect(result.success).toBe(false);
    expect(result.phase).toBe("VALIDATION");
    expect(result.error).toContain("score");
    expect(result.data).toBeUndefined();
  });

  // 5. Skor Di Luar Rentang (Out of allowed range)
  it("5. rejects score out of allowed bounds (< 0 or > 100)", () => {
    const tooHigh = JSON.stringify({
      score: 150,
      feedback: "Nilai melebihi batas maksimal",
    });
    const res1 = parseStructuredLLMOutput(tooHigh, smokeEvaluationSchema);
    expect(res1.success).toBe(false);
    expect(res1.phase).toBe("VALIDATION");
    expect(res1.error).toContain("Skor maksimal 100");

    const negative = JSON.stringify({
      score: -10,
      feedback: "Nilai negatif tidak diizinkan",
    });
    const res2 = parseStructuredLLMOutput(negative, smokeEvaluationSchema);
    expect(res2.success).toBe(false);
    expect(res2.phase).toBe("VALIDATION");
    expect(res2.error).toContain("Skor minimal 0");
  });

  // 6. Output Terpotong (Truncated JSON / Syntax Error)
  it("6. rejects truncated or incomplete JSON output without guessing fields", () => {
    const truncated = `{"score": 88, "feedback": "Kalimat penjelas yang tiba-tiba terputus karena max_tokens`;
    const result = parseStructuredLLMOutput(truncated, smokeEvaluationSchema);
    expect(result.success).toBe(false);
    expect(["SYNTAX", "EXTRACTION"]).toContain(result.phase);
    expect(result.data).toBeUndefined();
  });

  // 7. Teks Non-JSON (Conversational text without JSON)
  it("7. rejects pure non-JSON conversational text", () => {
    const nonJson =
      "Maaf, sebagai asisten AI saya tidak dapat menilai tugas ini karena topik di luar panduan.";
    const result = parseStructuredLLMOutput(nonJson, smokeEvaluationSchema);
    expect(result.success).toBe(false);
    expect(result.phase).toBe("EXTRACTION");
    expect(result.error).toContain("Tidak dapat mengekstraksi");
    expect(result.data).toBeUndefined();
  });

  // 8. Kontrak Penilaian Penuh (GradingResponseSchema)
  it("8. validates full multi-criteria grading response contract", () => {
    const fullGrading = {
      perCriterion: [
        {
          criterionId: "crit-1",
          score: 40,
          reasoning: "Analisis use-case akurat dan terstruktur.",
        },
        {
          criterionId: "crit-2",
          score: 45,
          reasoning: "Implementasi REST API sesuai standar best-practice.",
        },
      ],
      suggestedTotalScore: 85,
      suggestedFeedback: "Secara keseluruhan pemahaman sangat memuaskan.",
    };

    const validResult = parseStructuredLLMOutput(
      JSON.stringify(fullGrading),
      gradingResponseSchema,
    );
    expect(validResult.success).toBe(true);
    expect(validResult.data?.perCriterion.length).toBe(2);
    expect(validResult.data?.suggestedTotalScore).toBe(85);

    // Empty criteria rejected
    const invalidEmpty = {
      perCriterion: [],
      suggestedTotalScore: 0,
      suggestedFeedback: "Kosong",
    };
    const invalidResult = parseStructuredLLMOutput(
      JSON.stringify(invalidEmpty),
      gradingResponseSchema,
    );
    expect(invalidResult.success).toBe(false);
    expect(invalidResult.phase).toBe("VALIDATION");
  });
});
