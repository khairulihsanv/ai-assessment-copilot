/**
 * Embedding Client — Vector Embedding & Cosine Similarity
 *
 * Generates text embeddings using the configured provider (local, openai-compatible, or stub).
 * Computes cosine similarity for semantic matching.
 */

import { embeddingConfig } from "@/lib/config/rag-config";
import { generateEmbeddingLocal, generateEmbeddingsLocal } from "@/lib/ai/embedding-local";

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
export async function generateEmbedding(text: string, scopeKey?: string): Promise<EmbeddingResult> {
  const config = embeddingConfig();

  if (!text.trim()) {
    throw new EmbeddingError("INVALID_INPUT", "Teks untuk embedding tidak boleh kosong.");
  }

  // Very basic truncation fallback; properly chunked inputs shouldn't hit this.
  const MAX_TEXT_LENGTH = 8000;
  const truncatedText = text.slice(0, MAX_TEXT_LENGTH);
  
  // Hash text for cache lookup
  const crypto = await import("crypto");
  const checksum = crypto.createHash("sha256").update(truncatedText).digest("hex");
  const cacheScope = scopeKey || "global";

  try {
    const { prisma } = await import("@/lib/db/prisma");
    const cached = await prisma.embeddingCache.findUnique({
      where: {
        scopeKey_checksum_model_dimension: {
          scopeKey: cacheScope,
          checksum,
          model: config.model,
          dimension: config.dimension
        }
      }
    });

    if (cached) {
      await prisma.embeddingCache.update({
        where: { id: cached.id },
        data: { hits: { increment: 1 }, lastUsedAt: new Date() }
      });
      const vectors = cached.vectors as number[][] | number[];
      const embedding = Array.isArray(vectors[0]) ? vectors[0] as number[] : vectors as number[];
      
      return {
        embedding,
        model: config.model,
        tokenUsage: 0
      };
    }
  } catch (err) {
    console.warn("Embedding cache error:", err);
  }

  let embeddingData: number[];
  let tokenUsage = 0;

  try {
    if (config.kind === "local") {
      embeddingData = await generateEmbeddingLocal(truncatedText);
    } else if (config.kind === "stub") {
      // Return a random vector for testing
      embeddingData = Array.from({ length: config.dimension }, () => Math.random() * 2 - 1);
    } else {
      // OpenAI-compatible provider
      if (!config.apiKey) {
        throw new EmbeddingError("CONFIG_ERROR", "EMBEDDING_API_KEY belum dikonfigurasi.");
      }

      const response = await fetch(config.baseUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: config.model,
          input: truncatedText,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        let errorMessage = `Embedding API error (${response.status})`;
        try {
          const errorJson = JSON.parse(errorBody);
          errorMessage = errorJson?.error?.message || errorMessage;
        } catch {}
        throw new EmbeddingError("API_ERROR", errorMessage);
      }

      const data = await response.json();
      embeddingData = data.data?.[0]?.embedding;
      tokenUsage = data.usage?.total_tokens ?? 0;

      if (!embeddingData || !Array.isArray(embeddingData)) {
        throw new EmbeddingError("INVALID_RESPONSE", "API embedding tidak mengembalikan vector yang valid.");
      }
    }

    // Save to cache
    try {
      const { prisma } = await import("@/lib/db/prisma");
      await prisma.embeddingCache.create({
        data: {
          scopeKey: cacheScope,
          checksum,
          model: config.model,
          dimension: config.dimension,
          vectors: embeddingData as any,
        }
      });
    } catch (err) {
      console.warn("Failed to save embedding to cache", err);
    }

    return {
      embedding: embeddingData,
      model: config.model,
      tokenUsage,
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
export async function generateEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
  const config = embeddingConfig();
  const validTexts = texts.map((t) => (t.trim() ? t.slice(0, 8000) : ""));

  try {
    if (config.kind === "local") {
      // Use batch generation for local
      const filteredTexts = validTexts.filter(Boolean);
      let localEmbeddings: number[][] = [];
      
      if (filteredTexts.length > 0) {
        localEmbeddings = await generateEmbeddingsLocal(filteredTexts);
      }

      let embeddingIdx = 0;
      return validTexts.map((text) => {
        if (!text) return { embedding: [], model: config.model, tokenUsage: 0 };
        return {
          embedding: localEmbeddings[embeddingIdx++] || [],
          model: config.model,
          tokenUsage: 0,
        };
      });
    }

    // For others, map concurrently
    return await Promise.all(
      validTexts.map(async (text) => {
        if (!text) return { embedding: [], model: config.model, tokenUsage: 0 };
        try {
          return await generateEmbedding(text);
        } catch (error) {
          console.warn(
            `[Embedding] Gagal generate embedding untuk teks (${text.slice(0, 50)}...):`,
            error instanceof Error ? error.message : error
          );
          return { embedding: [], model: config.model, tokenUsage: 0 };
        }
      })
    );
  } catch (error) {
    console.error("[Embedding] Batch generation failed", error);
    // Fallback to empty embeddings
    return texts.map(() => ({ embedding: [], model: config.model, tokenUsage: 0 }));
  }
}

// ─── Cosine Similarity ─── //
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0 || vecA.length !== vecB.length) {
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
  materialText?: string | null,
  submissionId?: string
): Promise<SimilarityResult> {
  let answerKeySimilarity = 0;
  let materialSimilarity = 0;

  try {
    const scopeKey = submissionId ? `sub:${submissionId}` : undefined;
    const studentEmbedding = await generateEmbedding(studentAnswer, scopeKey);

    if (answerKeyEmbedding && answerKeyEmbedding.length > 0) {
      answerKeySimilarity = cosineSimilarity(studentEmbedding.embedding, answerKeyEmbedding);
    }

    if (materialEmbedding && materialEmbedding.length > 0) {
      materialSimilarity = cosineSimilarity(studentEmbedding.embedding, materialEmbedding);
    }
  } catch (error) {
    console.warn(
      "[Embedding] Gagal compute similarity, fallback ke text-based:",
      error instanceof Error ? error.message : error
    );

    answerKeySimilarity = answerKeyText ? simpleTextOverlap(studentAnswer, answerKeyText) : 0;
    materialSimilarity = materialText ? simpleTextOverlap(studentAnswer, materialText) : 0;
  }

  const answerKeyWeight = answerKeyEmbedding?.length ? 0.7 : 0;
  const materialWeight = materialEmbedding?.length ? 0.3 : 0;
  const totalWeight = answerKeyWeight + materialWeight || 1;

  const combinedScore = Math.round(
    ((answerKeySimilarity * answerKeyWeight + materialSimilarity * materialWeight) / totalWeight) * 100
  );

  return {
    answerKeySimilarity: Math.round(answerKeySimilarity * 1000) / 1000,
    materialSimilarity: Math.round(materialSimilarity * 1000) / 1000,
    combinedScore: Math.min(100, Math.max(0, combinedScore)),
    classification: classifyScore(combinedScore),
  };
}

// ─── Classification Thresholds ─── //
function classifyScore(score: number): SimilarityResult["classification"] {
  if (score >= 80) return "SANGAT_BAIK";
  if (score >= 65) return "BAIK";
  if (score >= 50) return "CUKUP";
  if (score >= 30) return "KURANG";
  return "TIDAK_SESUAI";
}

// ─── Fallback: Simple Text Overlap ─── //
function simpleTextOverlap(textA: string, textB: string): number {
  const wordsA = new Set(
    textA.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter((w) => w.length > 2)
  );
  const wordsB = new Set(
    textB.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter((w) => w.length > 2)
  );

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let overlapCount = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) overlapCount++;
  }

  const union = new Set([...wordsA, ...wordsB]);
  return overlapCount / union.size;
}

// ─── Custom Error ─── //
export class EmbeddingError extends Error {
  constructor(
    public code: "CONFIG_ERROR" | "API_ERROR" | "INVALID_INPUT" | "INVALID_RESPONSE" | "UNKNOWN",
    message: string
  ) {
    super(message);
    this.name = "EmbeddingError";
  }
}
