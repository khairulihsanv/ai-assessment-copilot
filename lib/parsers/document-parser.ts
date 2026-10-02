import { extractTextFromBuffer } from "@/lib/ai/extract-text";
import { getStorage } from "@/lib/storage/storage";
import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";

export async function processDocumentVersion(versionId: string) {
  try {
    // 1. Mark as EXTRACTING
    await prisma.documentVersion.update({
      where: { id: versionId },
      data: { extractionStatus: "EXTRACTING" }
    });

    const version = await prisma.documentVersion.findUnique({
      where: { id: versionId }
    });
    
    if (!version) throw new Error("Version not found");

    const storage = getStorage();
    const buffer = await storage.get(version.objectKey);
    let rawText = "";

    // 2. Extract Text based on MIME
    if (version.mimeType === "application/pdf") {
      rawText = await extractTextFromBuffer(buffer, "PDF");
    } else if (version.mimeType === "text/plain") {
      rawText = buffer.toString("utf-8");
    } else {
      throw new Error(`Unsupported mime type: ${version.mimeType}. Only PDF and TXT are supported in this MVP.`);
    }

    if (!rawText || rawText.trim() === "") {
      throw new Error("File empty or unreadable (perhaps scanned PDF without OCR).");
    }

    // 3. Chunking (Simple naive chunking by paragraphs/newlines for now)
    // PRD DX08: Chunk mengikuti struktur...
    const chunks = rawText.split(/\n\s*\n/).filter(c => c.trim().length > 0);

    const chunkPromises = chunks.map(async (chunkText, index) => {
      const hash = crypto.createHash("sha256");
      hash.update(chunkText);
      const checksum = hash.digest("hex");

      return prisma.documentChunk.create({
        data: {
          documentVersionId: version.id,
          rawText: chunkText.trim(),
          locator: { type: "paragraph_index", index }, // Basic locator
          checksum,
        }
      });
    });

    await Promise.all(chunkPromises);

    // 4. Update status to REVIEW_REQUIRED
    await prisma.documentVersion.update({
      where: { id: versionId },
      data: { extractionStatus: "REVIEW_REQUIRED" }
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
