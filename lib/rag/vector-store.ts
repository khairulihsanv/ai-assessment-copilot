import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

/**
 * Inserts or updates chunk embeddings.
 * Prisma requires using raw SQL for `vector` types.
 */
export async function upsertChunkEmbeddings(
  chunkId: string,
  classId: string,
  assignmentId: string,
  documentVersionId: string,
  sourceType: string,
  parserVersion: string,
  checksum: string,
  indexGeneration: string,
  model: string,
  dimension: number,
  embedding: number[]
) {
  // Prisma format for vector insertion: '[1.1, 2.2, ...]'
  const vectorStr = `[${embedding.join(",")}]`;

  await prisma.$executeRaw`
    INSERT INTO "chunk_embeddings" (
      "id", "chunkId", "classId", "assignmentId", "documentVersionId",
      "sourceType", "parserVersion", "checksum", "indexGeneration",
      "model", "dimension", "embedding", "state", "createdAt"
    )
    VALUES (
      gen_random_uuid()::text, ${chunkId}, ${classId}, ${assignmentId}, ${documentVersionId},
      ${sourceType}::"SourceType", ${parserVersion}, ${checksum}, ${indexGeneration},
      ${model}, ${dimension}, ${vectorStr}::vector, 'READY', NOW()
    )
    ON CONFLICT ("chunkId", "indexGeneration", "model")
    DO UPDATE SET
      "embedding" = EXCLUDED."embedding",
      "state" = EXCLUDED."state",
      "checksum" = EXCLUDED."checksum"
  `;
}

export async function searchSimilarChunks(
  assignmentId: string,
  indexGeneration: string,
  model: string,
  queryEmbedding: number[],
  topK: number,
  minSimilarity: number
) {
  const vectorStr = `[${queryEmbedding.join(",")}]`;

  // We use inner product (<#>) if vectors are normalized, but cosine distance (<=>) is safer.
  // cosine distance = 1 - cosine similarity. So similarity = 1 - distance.
  const distanceThreshold = 1 - minSimilarity;

  type ResultRow = {
    id: string;
    chunkId: string;
    documentVersionId: string;
    rawText: string;
    locator: any;
    heading: string | null;
    distance: number;
    similarity: number;
  };

  const results = await prisma.$queryRaw<ResultRow[]>`
    SELECT 
      e.id, 
      e."chunkId", 
      e."documentVersionId",
      c."rawText",
      c."locator",
      c."heading",
      (e.embedding <=> ${vectorStr}::vector) as distance
    FROM "chunk_embeddings" e
    JOIN "document_chunks" c ON c.id = e."chunkId"
    WHERE e."assignmentId" = ${assignmentId}
      AND e."indexGeneration" = ${indexGeneration}
      AND e.model = ${model}
      AND e.state = 'READY'
      AND (e.embedding <=> ${vectorStr}::vector) <= ${distanceThreshold}
    ORDER BY distance ASC
    LIMIT ${topK}
  `;

  return results.map(row => ({
    ...row,
    similarity: 1 - row.distance
  }));
}
