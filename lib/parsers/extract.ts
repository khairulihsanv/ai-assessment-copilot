/**
 * Document extraction -> ordered structural blocks with precise locators.
 * Supported natively: PDF (text layer), DOCX, PPTX, TXT.
 * Legacy DOC/PPT need LibreOffice (`soffice`); scanned PDFs need OCR (tesseract).
 * When those external tools are unavailable the extraction FAILS with an explicit
 * code instead of silently producing empty or partial text.
 */
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import JSZip from "jszip";
import mammoth from "mammoth";
import { documentLimits } from "@/lib/config/rag-config";
import type { SourceBlock } from "@/lib/rag/chunker";
import { detectDocumentKind, type DocumentKind, inspectZip } from "@/lib/parsers/validate-file";

export const PARSER_VERSION = "parser-2";
const execFileAsync = promisify(execFile);

export class ExtractionError extends Error {
  constructor(
    public code: "NO_TEXT_OCR_REQUIRED" | "CONVERTER_UNAVAILABLE" | "TOO_MANY_PAGES" | "TOO_MUCH_TEXT" | "TIMEOUT" | "PARSE_FAILED" | "EMPTY",
    message: string,
  ) {
    super(message);
    this.name = "ExtractionError";
  }
}

export interface ExtractionResult {
  kind: DocumentKind;
  blocks: SourceBlock[];
  pageCount: number;
  method: string;
  qualityFlags: string[];
  parserVersion: string;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let t: NodeJS.Timeout;
  return Promise.race([
    p,
    new Promise<T>((_, rej) => {
      t = setTimeout(() => rej(new ExtractionError("TIMEOUT", "Ekstraksi dokumen melebihi batas waktu.")), ms);
    }),
  ]).finally(() => clearTimeout(t)) as Promise<T>;
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
export function decodeXmlEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, g: string) => {
    if (g[0] === "#") {
      const code = g[1].toLowerCase() === "x" ? parseInt(g.slice(2), 16) : parseInt(g.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[g.toLowerCase()] ?? m;
  });
}

function stripTags(html: string): string {
  return decodeXmlEntities(html.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "")).replace(/[ \t]+/g, " ").trim();
}

// ---------- PDF ----------

const NUMBERED_HEADING = /^(?:\d+(?:\.\d+)*[.)]?|[IVXLC]+\.|[A-Z][.)])\s+\S.{0,78}$/;
function looksLikeHeading(line: string): boolean {
  const t = line.trim();
  if (t.length < 3 || t.length > 80 || /[.,;:]$/.test(t)) return false;
  const letters = t.replace(/[^\p{L}]/gu, "");
  const isUpper = letters.length >= 3 && letters === letters.toUpperCase();
  return isUpper || NUMBERED_HEADING.test(t);
}

async function extractPdf(buffer: Buffer): Promise<ExtractionResult> {
  const limits = documentLimits();
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    if (result.total > limits.maxPages) {
      throw new ExtractionError("TOO_MANY_PAGES", `PDF memiliki ${result.total} halaman (batas ${limits.maxPages}).`);
    }
    const blocks: SourceBlock[] = [];
    const emptyPages: number[] = [];
    let chars = 0;
    for (const page of result.pages) {
      const text = (page.text ?? "").replace(/\r\n?/g, "\n").trim();
      if (text.replace(/\s/g, "").length < 20) {
        emptyPages.push(page.num);
        continue;
      }
      chars += text.length;
      if (chars > limits.maxExtractedChars) throw new ExtractionError("TOO_MUCH_TEXT", "Teks hasil ekstraksi melebihi batas.");
      const locator = { type: "pdf_page", page: page.num };
      for (const para of text.split(/\n{2,}/)) {
        const p = para.trim();
        if (!p) continue;
        const oneLine = !p.includes("\n");
        blocks.push({ kind: oneLine && looksLikeHeading(p) ? "heading" : "paragraph", text: p.replace(/\n/g, " "), locator });
      }
    }
    if (blocks.length === 0) {
      throw new ExtractionError(
        "NO_TEXT_OCR_REQUIRED",
        "PDF tidak memiliki lapisan teks (kemungkinan hasil pindai). OCR diperlukan namun belum tersedia pada lingkungan ini.",
      );
    }
    const flags: string[] = [];
    if (emptyPages.length > 0) flags.push(`PAGES_WITHOUT_TEXT:${emptyPages.join(",")}`);
    return { kind: "pdf", blocks, pageCount: result.total, method: "pdf-parse-text-layer", qualityFlags: flags, parserVersion: PARSER_VERSION };
  } catch (e) {
    if (e instanceof ExtractionError) throw e;
    throw new ExtractionError("PARSE_FAILED", `Gagal membaca PDF: ${e instanceof Error ? e.message : "kesalahan tidak diketahui"}`);
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}

// ---------- DOCX ----------

async function extractDocx(buffer: Buffer): Promise<ExtractionResult> {
  const limits = documentLimits();
  try {
    const { value: html } = await mammoth.convertToHtml({ buffer });
    const blocks: SourceBlock[] = [];
    let section = 0;
    let sectionHeading: string | null = null;
    const locator = () => ({ type: "docx_section", section, ...(sectionHeading ? { heading: sectionHeading } : {}) });
    const tokenRe = /<(h[1-6]|p|ul|ol|table)\b[^>]*>([\s\S]*?)<\/\1>/gi;
    let m: RegExpExecArray | null;
    let chars = 0;
    while ((m = tokenRe.exec(html))) {
      const tag = m[1].toLowerCase();
      const inner = m[2];
      if (tag.startsWith("h")) {
        const t = stripTags(inner);
        if (!t) continue;
        section++;
        sectionHeading = t;
        blocks.push({ kind: "heading", text: t, locator: locator() });
      } else if (tag === "p") {
        const t = stripTags(inner);
        if (t) blocks.push({ kind: "paragraph", text: t, locator: locator() });
        chars += t.length;
      } else if (tag === "ul" || tag === "ol") {
        const items = [...inner.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map((x) => `• ${stripTags(x[1])}`).filter((x) => x.length > 2);
        if (items.length) blocks.push({ kind: "list", text: items.join("\n"), locator: locator() });
        chars += items.join("").length;
      } else if (tag === "table") {
        const rows = [...inner.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((r) =>
          [...r[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => stripTags(c[1])).join(" | "),
        );
        const text = rows.filter(Boolean).join("\n");
        if (text) blocks.push({ kind: "table", text, locator: locator() });
        chars += text.length;
      }
      if (chars > limits.maxExtractedChars) throw new ExtractionError("TOO_MUCH_TEXT", "Teks hasil ekstraksi melebihi batas.");
    }
    if (blocks.length === 0) throw new ExtractionError("EMPTY", "Dokumen DOCX tidak mengandung teks.");
    const flags: string[] = [];
    if (/<img\b/i.test(html)) flags.push("CONTAINS_IMAGES_NOT_EXTRACTED");
    return { kind: "docx", blocks, pageCount: Math.max(1, section), method: "mammoth-html", qualityFlags: flags, parserVersion: PARSER_VERSION };
  } catch (e) {
    if (e instanceof ExtractionError) throw e;
    throw new ExtractionError("PARSE_FAILED", `Gagal membaca DOCX: ${e instanceof Error ? e.message : "kesalahan tidak diketahui"}`);
  }
}

// ---------- PPTX ----------

function paragraphsFromXml(xml: string): string[] {
  return [...xml.matchAll(/<a:p\b[^>]*>([\s\S]*?)<\/a:p>/g)]
    .map((p) => decodeXmlEntities([...p[1].matchAll(/<a:t\b[^>]*>([\s\S]*?)<\/a:t>/g)].map((t) => t[1]).join("")).trim())
    .filter(Boolean);
}

async function extractPptx(buffer: Buffer): Promise<ExtractionResult> {
  const limits = documentLimits();
  const { names } = await inspectZip(buffer);
  const zip = await JSZip.loadAsync(buffer);
  const slideNames = names.filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a, b) => parseInt(a.match(/\d+/)![0], 10) - parseInt(b.match(/\d+/)![0], 10));
  if (slideNames.length > limits.maxPages) throw new ExtractionError("TOO_MANY_PAGES", `PPTX memiliki ${slideNames.length} slide (batas ${limits.maxPages}).`);
  const blocks: SourceBlock[] = [];
  let chars = 0;
  const flags: string[] = [];
  for (const name of slideNames) {
    const slide = parseInt(name.match(/\d+/)![0], 10);
    const xml = await zip.files[name].async("string");
    const locator = { type: "pptx_slide", slide };
    for (const sp of xml.split(/<p:sp\b/).slice(1)) {
      const paras = paragraphsFromXml(sp);
      if (paras.length === 0) continue;
      const isTitle = /<p:ph\b[^>]*type="(?:title|ctrTitle)"/.test(sp);
      if (isTitle) blocks.push({ kind: "heading", text: paras.join(" "), locator });
      else blocks.push({ kind: "paragraph", text: paras.join("\n\n"), locator });
      chars += paras.join("").length;
    }
    const notes = names.find((n) => n === `ppt/notesSlides/notesSlide${slide}.xml`);
    if (notes) {
      const nparas = paragraphsFromXml(await zip.files[notes].async("string")).filter((t) => !/^\d+$/.test(t));
      if (nparas.length) blocks.push({ kind: "paragraph", text: nparas.join("\n\n"), locator: { type: "pptx_slide", slide, part: "notes" } });
    }
    if (names.some((n) => n.startsWith("ppt/media/"))) flags.push("CONTAINS_MEDIA_NOT_EXTRACTED");
    if (chars > limits.maxExtractedChars) throw new ExtractionError("TOO_MUCH_TEXT", "Teks hasil ekstraksi melebihi batas.");
  }
  if (blocks.length === 0) throw new ExtractionError("EMPTY", "Presentasi tidak mengandung teks.");
  return { kind: "pptx", blocks, pageCount: slideNames.length, method: "pptx-xml", qualityFlags: [...new Set(flags)], parserVersion: PARSER_VERSION };
}

// ---------- TXT ----------

function extractTxt(buffer: Buffer): ExtractionResult {
  const limits = documentLimits();
  let text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  if (text.length > limits.maxExtractedChars) throw new ExtractionError("TOO_MUCH_TEXT", "Teks melebihi batas.");
  const blocks: SourceBlock[] = text
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => ({ kind: "paragraph" as const, text: p.replace(/\n/g, " "), locator: { type: "text" } }));
  if (blocks.length === 0) throw new ExtractionError("EMPTY", "Berkas teks kosong.");
  return { kind: "txt", blocks, pageCount: 1, method: "utf8-text", qualityFlags: [], parserVersion: PARSER_VERSION };
}

// ---------- Legacy DOC/PPT via LibreOffice ----------

async function convertLegacy(buffer: Buffer, kind: "doc" | "ppt"): Promise<{ buffer: Buffer; kind: "docx" | "pptx" }> {
  const bin = process.env.SOFFICE_PATH ?? "soffice";
  const dir = await mkdtemp(join(tmpdir(), "dexa-conv-"));
  const target = kind === "doc" ? "docx" : "pptx";
  try {
    await writeFile(join(dir, `in.${kind}`), buffer);
    await execFileAsync(bin, ["--headless", "--norestore", "--convert-to", target, "--outdir", dir, join(dir, `in.${kind}`)], {
      timeout: documentLimits().extractTimeoutMs,
      windowsHide: true,
    });
    return { buffer: await readFile(join(dir, `in.${target}`)), kind: target };
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      throw new ExtractionError("CONVERTER_UNAVAILABLE", `Format .${kind} memerlukan LibreOffice (soffice) yang tidak tersedia. Unggah ulang sebagai .${target} atau PDF.`);
    }
    throw new ExtractionError("PARSE_FAILED", `Konversi .${kind} gagal: ${err.message}`);
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}

/** Entry point used by the document-extract job handler. */
export async function extractDocument(buffer: Buffer, filename: string): Promise<ExtractionResult> {
  const kind = await detectDocumentKind(buffer, filename);
  const limits = documentLimits();
  return withTimeout(
    (async () => {
      switch (kind) {
        case "pdf":
          return extractPdf(buffer);
        case "docx":
          return extractDocx(buffer);
        case "pptx":
          return extractPptx(buffer);
        case "txt":
          return extractTxt(buffer);
        case "doc":
        case "ppt": {
          const converted = await convertLegacy(buffer, kind);
          const res = converted.kind === "docx" ? await extractDocx(converted.buffer) : await extractPptx(converted.buffer);
          return { ...res, kind, method: `libreoffice+${res.method}` };
        }
      }
    })(),
    limits.extractTimeoutMs,
  );
}
