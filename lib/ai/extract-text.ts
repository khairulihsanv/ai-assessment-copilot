import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import { readFile } from "fs/promises";
import { join } from "path";

export async function extractTextFromFile(
  filePath: string,
  fileType: "PDF" | "DOCX"
): Promise<string> {
  const absolutePath = filePath.startsWith("/") || filePath.includes(":")
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

async function extractFromPDF(buffer: Buffer): Promise<string> {
  try {
    const parser = new PDFParse({ data: buffer });
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
      `Gagal mengekstrak teks dari PDF: ${error instanceof Error ? error.message : "Unknown error"}`
    );
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
      `Gagal mengekstrak teks dari DOCX: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
