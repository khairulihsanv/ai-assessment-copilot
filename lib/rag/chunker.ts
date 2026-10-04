/**
 * Structure-aware chunker.
 *
 * Input: ordered blocks (heading / paragraph / list / code / table) each tagged with a
 * "unit" locator (pdf page, slide, docx paragraph range). Output: chunks that
 *  - never cross unit boundaries (so a citation always points to one page/slide),
 *  - never exceed `maxTokens` (estimated, conservative),
 *  - never DROP content (every sentence/line ends up in exactly one chunk, plus optional overlap),
 *  - keep code/table lines intact whenever they fit, splitting only on line boundaries.
 */
import { chunkingConfig } from "@/lib/config/rag-config";
import { detectLanguage, estimateTokens, normalizeText, sha256, splitSentences } from "@/lib/rag/text";

export type BlockKind = "heading" | "paragraph" | "list" | "code" | "table";

export interface SourceBlock {
  kind: BlockKind;
  text: string;
  /** Locator of the containing unit, e.g. { type: "pdf_page", page: 3 } */
  locator: Record<string, unknown>;
}

export interface ChunkDraft {
  chunkIndex: number;
  rawText: string;
  normalizedText: string;
  tokenEstimate: number;
  locator: Record<string, unknown>;
  heading: string | null;
  language: string;
  flags: string[];
  checksum: string;
}

interface Atom {
  text: string;
  sep: string; // separator placed BEFORE this atom when joined
  tokens: number;
  overlappable: boolean;
}

function locatorKey(l: Record<string, unknown>): string {
  return JSON.stringify(l);
}

/** Split text that is still too large on word boundaries; as last resort on characters. */
function hardSplit(text: string, maxTokens: number): string[] {
  const words = text.split(/(\s+)/); // keep whitespace tokens to avoid losing structure
  const parts: string[] = [];
  let cur = "";
  for (const w of words) {
    if (estimateTokens(cur + w) > maxTokens && cur.trim()) {
      parts.push(cur.trim());
      cur = "";
    }
    if (estimateTokens(w) > maxTokens) {
      // single "word" longer than the budget (e.g. base64 / long URL): split by characters
      const step = Math.max(1, maxTokens * 3);
      for (let i = 0; i < w.length; i += step) parts.push(w.slice(i, i + step));
      continue;
    }
    cur += w;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

function atomsForBlock(block: SourceBlock, maxTokens: number): Atom[] {
  const atoms: Atom[] = [];
  const preserve = block.kind === "code" || block.kind === "table";
  if (preserve) {
    const lines = block.text.replace(/\r\n?/g, "\n").split("\n");
    lines.forEach((line, i) => {
      if (!line.trim()) return;
      for (const piece of estimateTokens(line) > maxTokens ? hardSplit(line, maxTokens) : [line]) {
        atoms.push({ text: piece, sep: atoms.length === 0 ? "" : "\n", tokens: estimateTokens(piece), overlappable: false });
      }
      void i;
    });
    return atoms;
  }
  const sentences = block.kind === "list" ? block.text.split("\n").map((s) => s.trim()).filter(Boolean) : splitSentences(block.text);
  sentences.forEach((s) => {
    const parts = estimateTokens(s) > maxTokens ? hardSplit(s, maxTokens) : [s];
    parts.forEach((p, idx) => {
      atoms.push({
        text: p,
        sep: atoms.length === 0 ? "" : block.kind === "list" ? "\n" : " ",
        tokens: estimateTokens(p),
        overlappable: block.kind !== "list",
      });
      void idx;
    });
  });
  return atoms;
}

export function chunkBlocks(
  blocks: SourceBlock[],
  options: { maxTokens?: number; overlapTokens?: number } = {},
): ChunkDraft[] {
  const cfg = chunkingConfig();
  const maxTokens = options.maxTokens ?? cfg.maxTokens;
  const overlapTokens = Math.min(options.overlapTokens ?? cfg.overlapTokens, Math.floor(maxTokens / 3));

  const chunks: ChunkDraft[] = [];
  let heading: string | null = null;

  // Group consecutive blocks by unit locator.
  let i = 0;
  while (i < blocks.length) {
    const unitKey = locatorKey(blocks[i].locator);
    const unitLocator = blocks[i].locator;
    const unitBlocks: SourceBlock[] = [];
    while (i < blocks.length && locatorKey(blocks[i].locator) === unitKey) unitBlocks.push(blocks[i++]);

    // Build flat list of (atom, block) in this unit, handling heading updates.
    let current: { atoms: Atom[]; heading: string | null; kinds: Set<BlockKind> } = { atoms: [], heading, kinds: new Set() };
    let ordinal = 0;

    const flush = (carryOverlap: boolean) => {
      if (current.atoms.length === 0) return;
      const text = current.atoms.map((a, idx) => (idx === 0 ? a.text : a.sep + a.text)).join("");
      const raw = text;
      const norm = normalizeText(raw, { preserveLayout: current.kinds.has("code") || current.kinds.has("table") });
      if (norm) {
        const flags: string[] = [];
        if (current.kinds.has("table")) flags.push("TABLE");
        if (current.kinds.has("code")) flags.push("CODE");
        chunks.push({
          chunkIndex: chunks.length,
          rawText: raw,
          normalizedText: norm,
          tokenEstimate: estimateTokens(norm),
          locator: { ...unitLocator, ordinal: ordinal++ },
          heading: current.heading,
          language: detectLanguage(norm),
          flags,
          checksum: sha256(raw),
        });
      }
      let carry: Atom[] = [];
      if (carryOverlap && overlapTokens > 0) {
        let t = 0;
        for (let k = current.atoms.length - 1; k >= 0; k--) {
          const a = current.atoms[k];
          if (!a.overlappable || t + a.tokens > overlapTokens) break;
          carry.unshift(a);
          t += a.tokens;
        }
        // Never carry the entire chunk (would loop without progress).
        if (carry.length === current.atoms.length) carry = [];
      }
      current = { atoms: carry.map((a, idx) => (idx === 0 ? { ...a, sep: "" } : a)), heading: current.heading, kinds: new Set() };
    };

    const currentTokens = () => current.atoms.reduce((s, a) => s + a.tokens + 1, 0);

    for (const block of unitBlocks) {
      if (block.kind === "heading") {
        flush(false);
        heading = block.text.trim().replace(/\s+/g, " ");
        current.heading = heading;
        continue;
      }
      const atoms = atomsForBlock(block, maxTokens);
      // A new paragraph/block starts after a blank line unless it is the first atom of a chunk.
      atoms.forEach((a, idx) => {
        const first = idx === 0;
        if (first && current.atoms.length > 0) a = { ...a, sep: block.kind === "paragraph" || block.kind === "list" ? "\n\n" : "\n\n" };
        if (currentTokens() + a.tokens + (a.sep.length ? 1 : 0) > maxTokens && current.atoms.length > 0) {
          flush(true);
          a = { ...a, sep: "" };
        }
        current.atoms.push(a);
        current.kinds.add(block.kind);
      });
    }
    flush(false);
  }
  return chunks.map((c, idx) => ({ ...c, chunkIndex: idx }));
}

/** Text that is embedded for a chunk: heading context + normalized content. */
export function embeddingInputForChunk(chunk: { heading: string | null; normalizedText: string }): string {
  return chunk.heading ? `${chunk.heading}\n${chunk.normalizedText}` : chunk.normalizedText;
}
