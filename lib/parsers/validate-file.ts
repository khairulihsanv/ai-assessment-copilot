/**
 * Upload validation by CONTENT (magic bytes + container inspection), not by the
 * client-declared MIME type or extension. Rejects encrypted PDFs, macro-enabled
 * Office files and zip bombs before any heavy parsing happens.
 */
import JSZip from "jszip";
import { documentLimits } from "@/lib/config/rag-config";

export type DocumentKind = "pdf" | "docx" | "pptx" | "txt" | "doc" | "ppt";

export class DocumentValidationError extends Error {
  constructor(
    public code:
      | "EMPTY"
      | "TOO_LARGE"
      | "UNSUPPORTED_TYPE"
      | "TYPE_MISMATCH"
      | "ENCRYPTED"
      | "MACRO_ENABLED"
      | "ZIP_BOMB"
      | "CORRUPT",
    message: string,
  ) {
    super(message);
    this.name = "DocumentValidationError";
  }
}

const EXT_TO_KIND: Record<string, DocumentKind> = {
  pdf: "pdf",
  docx: "docx",
  pptx: "pptx",
  txt: "txt",
  doc: "doc",
  ppt: "ppt",
};

export const KIND_TO_MIME: Record<DocumentKind, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain",
  doc: "application/msword",
  ppt: "application/vnd.ms-powerpoint",
};

function startsWith(buf: Buffer, bytes: number[]): boolean {
  return buf.length >= bytes.length && bytes.every((b, i) => buf[i] === b);
}

/** Inspect a ZIP's central directory (no decompression) to bound size and find the Office type. */
export async function inspectZip(buffer: Buffer): Promise<{ kind: "docx" | "pptx"; names: string[] }> {
  const limits = documentLimits();
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer, { checkCRC32: false });
  } catch {
    throw new DocumentValidationError("CORRUPT", "Berkas Office rusak atau bukan arsip ZIP yang valid.");
  }
  const names = Object.keys(zip.files);
  if (names.length > limits.maxZipEntries) {
    throw new DocumentValidationError("ZIP_BOMB", "Arsip dokumen memiliki terlalu banyak entri.");
  }
  let total = 0;
  for (const name of names) {
    // JSZip exposes the declared uncompressed size only on the internal _data; refuse if unknown.
    const size = (zip.files[name] as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize;
    if (typeof size !== "number") {
      throw new DocumentValidationError("CORRUPT", "Ukuran entri arsip tidak dapat diverifikasi.");
    }
    total += size;
    if (total > limits.maxZipUncompressedBytes) {
      throw new DocumentValidationError("ZIP_BOMB", "Ukuran dokumen setelah dekompresi melebihi batas aman.");
    }
  }
  if (names.some((n) => /vbaProject\.bin$/i.test(n))) {
    throw new DocumentValidationError("MACRO_ENABLED", "Dokumen berisi makro dan tidak diterima.");
  }
  if (names.includes("word/document.xml")) return { kind: "docx", names };
  if (names.includes("ppt/presentation.xml")) return { kind: "pptx", names };
  throw new DocumentValidationError("UNSUPPORTED_TYPE", "Arsip ZIP bukan dokumen DOCX/PPTX yang didukung.");
}

export async function detectDocumentKind(buffer: Buffer, filename: string): Promise<DocumentKind> {
  const limits = documentLimits();
  if (buffer.length === 0) throw new DocumentValidationError("EMPTY", "Berkas kosong.");
  if (buffer.length > limits.maxBytes) {
    throw new DocumentValidationError("TOO_LARGE", `Ukuran berkas melebihi batas ${Math.round(limits.maxBytes / 1024 / 1024)} MB.`);
  }
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const declared = EXT_TO_KIND[ext];

  let detected: DocumentKind;
  if (startsWith(buffer, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
    detected = "pdf";
    // Encrypted PDFs cannot be extracted; check the trailer area and head for /Encrypt.
    const probe = buffer.subarray(Math.max(0, buffer.length - 4096)).toString("latin1") + buffer.subarray(0, 4096).toString("latin1");
    if (/\/Encrypt\b/.test(probe)) throw new DocumentValidationError("ENCRYPTED", "PDF terenkripsi/diproteksi kata sandi tidak dapat diproses.");
  } else if (startsWith(buffer, [0x50, 0x4b, 0x03, 0x04])) {
    detected = (await inspectZip(buffer)).kind;
  } else if (startsWith(buffer, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) {
    if (declared !== "doc" && declared !== "ppt") {
      throw new DocumentValidationError("UNSUPPORTED_TYPE", "Format OLE tidak dikenali (hanya .doc/.ppt).");
    }
    detected = declared;
  } else {
    // Plain text: must be valid UTF-8 and contain no NUL bytes.
    if (buffer.includes(0x00)) throw new DocumentValidationError("UNSUPPORTED_TYPE", "Format berkas tidak didukung.");
    try {
      new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    } catch {
      throw new DocumentValidationError("UNSUPPORTED_TYPE", "Berkas teks harus berenkode UTF-8.");
    }
    detected = "txt";
  }
  if (declared && declared !== detected) {
    throw new DocumentValidationError("TYPE_MISMATCH", `Ekstensi .${ext} tidak sesuai isi berkas (${detected}).`);
  }
  if (!declared) {
    throw new DocumentValidationError("UNSUPPORTED_TYPE", "Ekstensi berkas tidak didukung (pdf, docx, pptx, txt, doc, ppt).");
  }
  return detected;
}
