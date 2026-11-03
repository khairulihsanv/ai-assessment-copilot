"use client";

import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { cn } from "@/shared/utils";

export interface EvidenceSpan {
  /** Stable key, e.g. "c2-0" (criterion index 2, quote 0). */
  key: string;
  start: number;
  end: number;
  /** 1-based criterion number shown as superscript. */
  criterion: number;
}

export interface SubmissionPageItem {
  id: string;
  pageNumber: number;
  imageUrl?: string;
  imageName?: string;
  extractedText?: string | null;
  confirmedText?: string | null;
  ocrStatus?: string | null;
}

interface MarkSegment {
  start: number;
  end: number;
  keys: string[];
  criteria: number[];
}

/** Merge spans into non-overlapping marks. Overlaps are folded into the earlier mark. */
export function buildMarks(text: string, spans: EvidenceSpan[]): MarkSegment[] {
  const valid = spans
    .filter((s) => s.start >= 0 && s.end > s.start && s.end <= text.length)
    .sort((a, b) => a.start - b.start || b.end - a.end);
  const marks: MarkSegment[] = [];
  for (const span of valid) {
    const last = marks[marks.length - 1];
    if (last && span.start < last.end) {
      last.keys.push(span.key);
      if (!last.criteria.includes(span.criterion)) last.criteria.push(span.criterion);
      last.end = Math.max(last.end, span.end);
      continue;
    }
    marks.push({ start: span.start, end: span.end, keys: [span.key], criteria: [span.criterion] });
  }
  return marks;
}

function HighlightedText({
  text,
  spans,
  activeKey,
  onMarkClick,
}: {
  text: string;
  spans: EvidenceSpan[];
  activeKey: string | null;
  onMarkClick: (key: string, criterion: number) => void;
}) {
  const marks = useMemo(() => buildMarks(text, spans), [text, spans]);
  const nodes: ReactNode[] = [];
  let cursor = 0;
  for (const m of marks) {
    if (m.start > cursor) nodes.push(text.slice(cursor, m.start));
    const firstKey = m.keys[0] ?? "";
    nodes.push(
      // Mouse shortcut only: the keyboard equivalent is the quote button in the criteria panel.
      // biome-ignore lint/a11y/useKeyWithClickEvents: keyboard path exists via the quote buttons
      <mark
        key={firstKey}
        className="evidence"
        data-evidence-keys={m.keys.join(" ")}
        data-active={activeKey !== null && m.keys.includes(activeKey) ? "true" : undefined}
        onClick={() => onMarkClick(firstKey, m.criteria[0] ?? 1)}
        title={`Bukti untuk kriteria ${m.criteria.join(", ")}`}
      >
        {text.slice(m.start, m.end)}
        <sup>{m.criteria.join(",")}</sup>
      </mark>,
    );
    cursor = m.end;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return <>{nodes}</>;
}

type Tab = "text" | "pages" | "ocr";

export function AnswerViewer({
  submissionId,
  versionId,
  studentName,
  submissionType,
  content,
  rawOcrText,
  isEdited,
  pages,
  fileName,
  hasFile,
  spans,
  activeKey,
  onMarkClick,
}: {
  submissionId: string;
  versionId: string;
  studentName: string;
  submissionType: string;
  content: string;
  rawOcrText?: string | null;
  isEdited?: boolean;
  pages: SubmissionPageItem[];
  fileName?: string | null;
  hasFile: boolean;
  spans: EvidenceSpan[];
  activeKey: string | null;
  onMarkClick: (key: string, criterion: number) => void;
}) {
  const [tab, setTab] = useState<Tab>("text");
  const [pageIndex, setPageIndex] = useState(0);
  const hasPages = pages.length > 0;
  const hasOcr = Boolean(rawOcrText);
  const page = pages[pageIndex];

  const tabs: { id: Tab; label: string; show: boolean }[] = [
    { id: "text", label: isEdited ? "Teks terkonfirmasi" : "Teks", show: true },
    { id: "pages", label: "Halaman asli", show: hasPages },
    { id: "ocr", label: "OCR mentah", show: hasOcr },
  ];
  const visibleTabs = tabs.filter((t) => t.show);

  return (
    <section
      aria-labelledby="answer-heading"
      className="flex min-h-0 flex-col rounded-xl border border-border bg-card"
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <h2 id="answer-heading" className="text-base font-semibold">
            Jawaban mahasiswa
          </h2>
          <p className="truncate text-xs text-muted-foreground">
            {studentName} · {submissionType}
            {hasPages ? ` · ${pages.length} halaman` : ""}
          </p>
        </div>
        {hasFile && (
          <a
            href={`/api/submissions/${submissionId}/file?versionId=${encodeURIComponent(versionId)}`}
            download={fileName || undefined}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm hover:bg-muted"
          >
            <Download size={15} aria-hidden="true" />
            Unduh berkas
          </a>
        )}
      </header>

      {visibleTabs.length > 1 && (
        <div
          role="tablist"
          aria-label="Tampilan jawaban"
          className="flex gap-1 border-b border-border px-3 pt-2"
        >
          {visibleTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`answer-tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`answer-panel-${t.id}`}
              onClick={() => setTab(t.id)}
              className={cn(
                "-mb-px border-b-2 px-3 py-2 text-sm",
                tab === t.id
                  ? "border-primary font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === "text" && (
          <div
            id="answer-panel-text"
            role="tabpanel"
            aria-labelledby="answer-tab-text"
            className="p-4"
          >
            {isEdited && (
              <p className="mb-3 rounded-lg border border-warning-border bg-warning-bg px-3 py-2 text-xs text-warning-fg">
                Mahasiswa mengoreksi teks hasil OCR sebelum mengirim. AI dan dosen menilai teks
                terkonfirmasi ini.
              </p>
            )}
            {content ? (
              <div className="text-[15px] leading-7 break-words whitespace-pre-wrap">
                <HighlightedText
                  text={content}
                  spans={spans}
                  activeKey={activeKey}
                  onMarkClick={onMarkClick}
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Teks jawaban tidak tersedia. Periksa berkas asli sebelum menilai.
              </p>
            )}
          </div>
        )}

        {tab === "pages" && page && (
          <div
            id="answer-panel-pages"
            role="tabpanel"
            aria-labelledby="answer-tab-pages"
            className="space-y-3 p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setPageIndex((i) => Math.max(0, i - 1))}
                disabled={pageIndex === 0}
                aria-label="Halaman sebelumnya"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border disabled:opacity-40"
              >
                <ChevronLeft size={16} aria-hidden="true" />
              </button>
              <span className="tabular text-sm">
                Halaman {page.pageNumber} dari {pages.length}
              </span>
              <button
                type="button"
                onClick={() => setPageIndex((i) => Math.min(pages.length - 1, i + 1))}
                disabled={pageIndex >= pages.length - 1}
                aria-label="Halaman berikutnya"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border disabled:opacity-40"
              >
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </div>
            <img
              src={`/api/submissions/${submissionId}/pages/${page.pageNumber}/image?versionId=${encodeURIComponent(versionId)}`}
              alt={`Lembar jawaban halaman ${page.pageNumber}`}
              className="w-full rounded-lg border border-border bg-muted object-contain"
            />
            {page.ocrStatus === "ERROR" && (
              <p className="text-xs text-danger-fg">OCR gagal membaca halaman ini.</p>
            )}
          </div>
        )}

        {tab === "ocr" && (
          <div
            id="answer-panel-ocr"
            role="tabpanel"
            aria-labelledby="answer-tab-ocr"
            className="p-4"
          >
            <p className="mb-2 text-xs text-muted-foreground">
              Teks mentah dari mesin OCR, sebelum dikoreksi mahasiswa.
            </p>
            <pre className="font-mono text-[13px] leading-6 break-words whitespace-pre-wrap">
              {rawOcrText}
            </pre>
          </div>
        )}
      </div>
    </section>
  );
}
