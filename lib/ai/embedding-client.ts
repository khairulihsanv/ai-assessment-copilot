/**
 * Embedding Client — Vector Embedding & Cosine Similarity
 *
 * Generates text embeddings via the Groq OpenAI-compatible API,
 * then computes cosine similarity for semantic matching between
 * student answers and the dosen's answer key / reference material.
 */

// ─── Configuration ─── //
const GROQ_EMBEDDING_URL = "https://api.groq.com/openai/v1/embeddings";
const EMBEDDING_MODEL = "nomic-embed-text-v1.5";
const MAX_TEXT_LENGTH = 8000; // characters, to stay within token limits

// ─── Types ─── //
export interface EmbeddingResult {
  embedding: number[];
  model: string;
  tokenUsage: number;
}

export interface SimilarityResult {
  answerKeySimilarity: number; // 0-1
  materialSimilarity: number; // 0-1
  combinedScore: number; // 0-100 (weighted classification score)
  classification: "SANGAT_BAIK" | "BAIK" | "CUKUP" | "KURANG" | "TIDAK_SESUAI";
}

// ─── Generate Embedding ─── //
export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new EmbeddingError(
      "CONFIG_ERROR",
      "GROQ_API_KEY belum dikonfigurasi untuk embedding."
    );
  }

  // Truncate text to avoid token limits
  const truncatedText = text.slice(0, MAX_TEXT_LENGTH);

  if (!truncatedText.trim()) {
    throw new EmbeddingError(
      "INVALID_INPUT",
      "Teks untuk embedding tidak boleh kosong."
    );
  }

  try {
    const response = await fetch(GROQ_EMBEDDING_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: truncatedText,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      let errorMessage = `Embedding API error (${response.status})`;

      try {
        const errorJson = JSON.parse(errorBody);
        errorMessage = errorJson?.error?.message || errorMessage;
      } catch {
        // use default
      }

      throw new EmbeddingError("API_ERROR", errorMessage);
    }

    const data = await response.json();
    const embeddingData = data.data?.[0]?.embedding;

    if (!embeddingData || !Array.isArray(embeddingData)) {
      throw new EmbeddingError(
        "INVALID_RESPONSE",
        "API embedding tidak mengembalikan vector yang valid."
      );
    }

    return {
      embedding: embeddingData,
      model: data.model || EMBEDDING_MODEL,
      tokenUsage: data.usage?.total_tokens ?? 0,
    };
  } catch (error) {
    if (error instanceof EmbeddingError) throw error;
    throw new EmbeddingError(
      "UNKNOWN",
      `Gagal generate embedding: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// ─── Batch Generate Embeddings ─── //
export async function generateEmbeddings(
  texts: string[]
): Promise<EmbeddingResult[]> {
  const results: EmbeddingResult[] = [];

  for (const text of texts) {
    if (text.trim()) {
      try {
        const result = await generateEmbedding(text);
        results.push(result);
      } catch (error) {
        console.warn(
          `[Embedding] Gagal generate embedding untuk teks (${text.slice(0, 50)}...):`,
          error instanceof Error ? error.message : error
        );
        // Push empty embedding on failure - will be handled gracefully downstream
        results.push({
          embedding: [],
          model: EMBEDDING_MODEL,
          tokenUsage: 0,
        });
      }
    } else {
      results.push({
        embedding: [],
        model: EMBEDDING_MODEL,
        tokenUsage: 0,
      });
    }
  }

  return results;
}

// ─── Cosine Similarity ─── //
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (
    !vecA ||
    !vecB ||
    vecA.length === 0 ||
    vecB.length === 0 ||
    vecA.length !== vecB.length
  ) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    const a = vecA[i] ?? 0;
    const b = vecB[i] ?? 0;
    dotProduct += a * b;
    normA += a * a;
    normB += b * b;
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

// ─── Compute Similarity Score ─── //
export async function computeSimilarity(
  studentAnswer: string,
  answerKeyEmbedding: number[] | null,
  materialEmbedding: number[] | null,
  answerKeyText?: string | null,
  materialText?: string | null
): Promise<SimilarityResult> {
  let answerKeySimilarity = 0;
  let materialSimilarity = 0;

  try {
    // Generate embedding for student answer
    const studentEmbedding = await generateEmbedding(studentAnswer);

    // Compare with answer key embedding
    if (answerKeyEmbedding && answerKeyEmbedding.length > 0) {
      answerKeySimilarity = cosineSimilarity(
        studentEmbedding.embedding,
        answerKeyEmbedding
      );
    }

    // Compare with material embedding
    if (materialEmbedding && materialEmbedding.length > 0) {
      materialSimilarity = cosineSimilarity(
        studentEmbedding.embedding,
        materialEmbedding
      );
    }
  } catch (error) {
    console.warn(
      "[Embedding] Gagal compute similarity, fallback ke text-based:",
      error instanceof Error ? error.message : error
    );

    // Fallback: simple text overlap scoring
    answerKeySimilarity = answerKeyText
      ? simpleTextOverlap(studentAnswer, answerKeyText)
      : 0;
    materialSimilarity = materialText
      ? simpleTextOverlap(studentAnswer, materialText)
      : 0;
  }

  // Weighted combination: answer key has more weight than material
  const answerKeyWeight = answerKeyEmbedding?.length ? 0.7 : 0;
  const materialWeight = materialEmbedding?.length ? 0.3 : 0;
  const totalWeight = answerKeyWeight + materialWeight || 1;

  const combinedScore = Math.round(
    ((answerKeySimilarity * answerKeyWeight +
      materialSimilarity * materialWeight) /
      totalWeight) *
      100
  );

  // Classify based on combined score
  const classification = classifyScore(combinedScore);

  return {
    answerKeySimilarity: Math.round(answerKeySimilarity * 1000) / 1000,
    materialSimilarity: Math.round(materialSimilarity * 1000) / 1000,
    combinedScore: Math.min(100, Math.max(0, combinedScore)),
    classification,
  };
}

// ─── Classification Thresholds ─── //
function classifyScore(
  score: number
): SimilarityResult["classification"] {
  if (score >= 80) return "SANGAT_BAIK";
  if (score >= 65) return "BAIK";
  if (score >= 50) return "CUKUP";
  if (score >= 30) return "KURANG";
  return "TIDAK_SESUAI";
}

// ─── Fallback: Simple Text Overlap ─── //
function simpleTextOverlap(textA: string, textB: string): number {
  const wordsA = new Set(
    textA
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
  const wordsB = new Set(
    textB
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let overlapCount = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) overlapCount++;
  }

  // Jaccard similarity
  const union = new Set([...wordsA, ...wordsB]);
  return overlapCount / union.size;
}

// ─── Custom Error ─── //
export class EmbeddingError extends Error {
  constructor(
    public code:
      | "CONFIG_ERROR"
      | "API_ERROR"
      | "INVALID_INPUT"
      | "INVALID_RESPONSE"
      | "UNKNOWN",
    message: string
  ) {
    super(message);
    this.name = "EmbeddingError";
  }
}
