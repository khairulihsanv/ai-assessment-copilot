import { readFile } from "node:fs/promises";
import { join } from "node:path";
import mammoth from "mammoth";

export async function extractTextFromFile(
  filePath: string,
  fileType: "PDF" | "DOCX",
): Promise<string> {
  const absolutePath =
    filePath.startsWith("/") || filePath.includes(":")
      ? filePath
      : join(process.cwd(), "uploads", filePath);

  const buffer = await readFile(absolutePath);

  switch (fileType) {
    case "PDF":
      return extractFromPDF(buffer);
    case "DOCX":
      return extractFromDOCX(buffer);
    default:
      throw new Error(`Tipe file tidak didukung: ${fileType}`);
  }
}

export async function extractTextFromBuffer(
  buffer: Buffer,
  fileType: "PDF" | "DOCX",
): Promise<string> {
  switch (fileType) {
    case "PDF":
      return extractFromPDF(buffer);
    case "DOCX":
      return extractFromDOCX(buffer);
    default:
      throw new Error(`Tipe file tidak didukung: ${fileType}`);
  }
}

async function extractFromPDF(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    const text = (result.text || "").trim();
    if (!text) {
      throw new Error("Dokumen PDF kosong atau tidak mengandung teks yang dapat dibaca.");
    }
    return text;
  } catch (error) {
    if (error instanceof Error && error.message.includes("kosong")) {
      throw error;
    }
    throw new Error(
      `Gagal mengekstrak teks dari PDF: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  } finally {
    await parser.destroy();
  }
}

async function extractFromDOCX(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value.trim();
    if (!text) {
      throw new Error("Dokumen DOCX kosong atau tidak mengandung teks yang dapat dibaca.");
    }
    return text;
  } catch (error) {
    if (error instanceof Error && error.message.includes("kosong")) {
      throw error;
    }
    throw new Error(
      `Gagal mengekstrak teks dari DOCX: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
