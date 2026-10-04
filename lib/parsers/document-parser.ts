import { prisma } from "@/lib/db/prisma";
import { getStorage } from "@/lib/storage/storage";
import { extractDocument } from "@/lib/parsers/extract";
import { chunkBlocks, embeddingInputForChunk } from "@/lib/rag/chunker";
import { generateEmbeddings } from "@/lib/ai/embedding-client";
import { upsertChunkEmbeddings } from "@/lib/rag/vector-store";
import { embeddingConfig } from "@/lib/config/rag-config";
import crypto from "crypto";

export async function processDocumentVersion(versionId: string) {
  try {
    // 1. Mark as EXTRACTING
    await prisma.documentVersion.update({
      where: { id: versionId },
      data: { extractionStatus: "EXTRACTING", errorMessage: null }
    });

    const version = await prisma.documentVersion.findUnique({
      where: { id: versionId },
      include: { document: { include: { assignment: true } } }
    });
    
    if (!version) throw new Error("Version not found");

    const storage = getStorage();
    const buffer = await storage.get(version.objectKey);
    
    // 2. Extract Text / Blocks
    // We pass a generic filename since we only have objectKey or MIME.
    const filename = version.originalName || `doc.${version.mimeType === "application/pdf" ? "pdf" : "docx"}`;
    const extraction = await extractDocument(buffer, filename);

    // 3. Chunking
    const chunks = chunkBlocks(extraction.blocks);

    if (chunks.length === 0) {
      throw new Error("No textual content found in document.");
    }

    // 4. Save Chunks to DB
    // We first delete existing chunks for this version (if any retry happened)
    await prisma.documentChunk.deleteMany({
      where: { documentVersionId: version.id }
    });

    const savedChunks = await Promise.all(
      chunks.map(chunk => 
        prisma.documentChunk.create({
          data: {
            documentVersionId: version.id,
            chunkIndex: chunk.chunkIndex,
            tokenEstimate: chunk.tokenEstimate,
            rawText: chunk.rawText,
            normalizedText: chunk.normalizedText,
            locator: chunk.locator as any,
            heading: chunk.heading,
            language: chunk.language,
            flags: chunk.flags,
            checksum: chunk.checksum,
          }
        })
      )
    );

    // 5. Generate and Save Embeddings
    const config = embeddingConfig();
    const indexGeneration = `idx_v1_${config.model.replace(/\//g, "_")}`;
    
    // Batch process embeddings
    const textsToEmbed = savedChunks.map(c => 
      embeddingInputForChunk({ heading: c.heading, normalizedText: c.normalizedText || c.rawText })
    );

    const embeddings = await generateEmbeddings(textsToEmbed);

    for (let i = 0; i < savedChunks.length; i++) {
      const chunk = savedChunks[i];
      const embeddingResult = embeddings[i];
      if (!chunk || !embeddingResult) continue;

      if (embeddingResult.embedding.length > 0) {
        await upsertChunkEmbeddings(
          chunk.id,
          version.document.assignment.classId,
          version.document.assignmentId,
          version.id,
          version.document.sourceType,
          extraction.parserVersion,
          chunk.checksum,
          indexGeneration,
          embeddingResult.model,
          embeddingResult.embedding.length,
          embeddingResult.embedding
        );
      }
    }

    // Update index generation on version
    await prisma.documentVersion.update({
      where: { id: versionId },
      data: {
        activeIndexGeneration: indexGeneration,
        indexedAt: new Date(),
        extractionStatus: "REVIEW_REQUIRED", // As per PRD, dosen needs to approve
        parserVersion: extraction.parserVersion,
        extractionMethod: extraction.method,
        pageCount: extraction.pageCount,
        qualityFlags: extraction.qualityFlags,
      }
    });
    
  } catch (error: any) {
    console.error("Document extraction failed:", error);
    await prisma.documentVersion.update({
      where: { id: versionId },
      data: { 
        extractionStatus: "FAILED",
        errorMessage: error.message || "Unknown error during extraction"
      }
    });
  }
}
