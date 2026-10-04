/**
 * NLP text utilities: normalization, token estimation, sentence splitting,
 * language heuristic. Deliberately conservative: never rewrites numbers,
 * negations, code, or formulas (see tests/rag-text.test.ts).
 */
import crypto from "node:crypto";

export const NORMALIZER_VERSION = "norm-1";

const INVISIBLE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200D\u2060\uFEFF\u00AD]/g;
// Hanya baris yang SELURUHNYA penanda halaman yang dibuang (bukan angka biasa).
const PAGE_MARKER = /^\s*(?:(?:halaman|hal\.?|page)\s+\d{1,4}(?:\s+(?:dari|of)\s+\d{1,4})?|[-–—]\s*\d{1,4}\s*[-–—])\s*$/i;

/**
 * Normalize text for embedding/retrieval. The raw text is always stored separately,
 * so nothing is lost. `preserveLayout` keeps line structure (code/tables).
 */
export function normalizeText(input: string, opts: { preserveLayout?: boolean } = {}): string {
  let t = input.normalize("NFKC").replace(/\r\n?/g, "\n").replace(INVISIBLE, "");
  if (!opts.preserveLayout) {
    // Sambung kata yang terpotong di akhir baris: "infor-\nmasi" -> "informasi" (hanya huruf kecil di kedua sisi).
    t = t.replace(/(\p{Ll})-\n(\p{Ll})/gu, "$1$2");
  }
  const lines = t.split("\n").map((l) => (opts.preserveLayout ? l.replace(/[ \t]+$/g, "") : l.replace(/[ \t]+/g, " ").trim()));
  const kept = lines.filter((l) => !PAGE_MARKER.test(l));
  return kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Conservative token estimate (over-estimates for Latin-script Indonesian/English
 * so chunks stay below the embedding model limit). Embedding providers additionally
 * verify with the real tokenizer where available.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  let wordish = 0;
  let symbols = 0;
  for (const ch of text) {
    if (/[\p{L}\p{N}]/u.test(ch)) wordish++;
    else if (!/\s/.test(ch)) symbols++;
  }
  // ~3 karakter huruf/angka per token, setiap simbol ~1 token.
  return Math.ceil(wordish / 3) + symbols;
}

const SENTENCE_BOUNDARY = /(?<=[.!?…])\s+(?=[\p{Lu}\p{N}"'“‘(\[])/u;

export function splitSentences(paragraph: string): string[] {
  return paragraph
    .split(/\n/)
    .flatMap((line) => line.split(SENTENCE_BOUNDARY))
    .map((s) => s.trim())
    .filter(Boolean);
}

const ID_WORDS = new Set(["yang", "dan", "di", "untuk", "dengan", "pada", "adalah", "dari", "ini", "itu", "dalam", "tidak", "akan"]);
const EN_WORDS = new Set(["the", "and", "of", "to", "is", "in", "for", "with", "that", "are", "this", "from", "not"]);

/** Heuristic language tag ("id" | "en" | "und"). Not a classifier; documented as such. */
export function detectLanguage(text: string): "id" | "en" | "und" {
  const words = text.toLowerCase().match(/\p{L}+/gu) ?? [];
  if (words.length < 8) return "und";
  let id = 0;
  let en = 0;
  for (const w of words) {
    if (ID_WORDS.has(w)) id++;
    else if (EN_WORDS.has(w)) en++;
  }
  if (id === 0 && en === 0) return "und";
  return id >= en ? "id" : "en";
}

export function sha256(text: string | Buffer): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}

/** Whitespace/case-insensitive containment used to verify LLM quotes against evidence. */
export function normalizeForQuoteMatch(s: string): string {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[“”„‟]/g, '"')
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}
