"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAIGradingStream } from "@/hooks/useAIGradingStream";
import { cn } from "@/shared/utils";
import { getErrorMessage } from "@/shared/utils/api-error";
import { AnswerViewer, type EvidenceSpan, type SubmissionPageItem } from "./review/answer-viewer";

export type { SubmissionPageItem };

// ─── Types ────────────────────────────────────────────────────────────────

type Confidence = "high" | "medium" | "low";
type Decision = "accepted" | "edited" | "rejected" | "manual";

interface Evidence {
  start: number;
  end: number;
  quote: string;
  passageId?: string | null;
  relevance?: string;
}

interface AICriterion {
  criterionId: string;
  score: number;
  confidence?: Confidence;
  reasoning?: string;
  feedback?: string;
  evidence?: Evidence[];
  needsReview?: boolean;
}

interface RubricCriterion {
  id: string;
  label: string;
  description?: string | null;
  maxScore: number;
  weight: number;
}

interface EvaluatorConfig {
  provider?: string;
  model?: string;
  anonymized?: boolean;
  retrievalMode?: string;
  unverifiedQuotesDropped?: number;
  missingCriteria?: string[];
}

export interface AIEvaluation {
  id?: string;
  suggestedTotalScore: number;
  suggestedFeedback: string;
  perCriterionScore: AICriterion[] | unknown;
  evaluatorConfig?: EvaluatorConfig | null;
  createdAt?: string | null;
}

interface CriterionFinal {
  criterionId: string;
  aiScore?: number | null;
  finalScore: number;
  decision: Decision;
  aiFeedback?: string | null;
  finalFeedback?: string | null;
}

interface AIStatus {
  ready?: boolean;
  reachable?: boolean;
  model?: string;
  local?: boolean;
  anonymized?: boolean;
  message?: string;
}

interface CriterionState {
  decision: Decision | null;
  score: string;
  feedback: string;
}

interface AIReviewPanelProps {
  submissionId: string;
  submissionVersionId: string;
  releasedGradeId: string | null;
  classId: string;
  assignmentId: string;
  assignmentTitle: string;
  maxScore: number;
  studentName: string;
  submissionType: string;
  submissionContent?: string | null;
  fileName?: string | null;
  fileUrl?: string | null;
  rawOcrText?: string | null;
  isEdited?: boolean | null;
  ocrStatus?: string | null;
  pageCount?: number | null;
  pages?: SubmissionPageItem[];
  rubricCriteria?: RubricCriterion[];
  initialAIEvaluation?: AIEvaluation | null;
  initialGrade?: {
    finalScore: number;
    finalFeedback: string;
    isAIAssisted: boolean;
    editedFromAI: boolean;
    createdAt: Date | string;
    perCriterionFinal?: CriterionFinal[] | null;
  } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

const numberFormat = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });
const fmt = (n: number) => numberFormat.format(n);

const confidenceLabel: Record<Confidence, string> = {
  high: "Yakin",
  medium: "Cukup yakin",
  low: "Kurang yakin",
};
const confidenceClass: Record<Confidence, string> = {
  high: "border-success-border bg-success-bg text-success-fg",
  medium: "border-border bg-muted text-muted-foreground",
  low: "border-warning-border bg-warning-bg text-warning-fg",
};

const decisionOptions: { value: Exclude<Decision, "manual">; label: string }[] = [
  { value: "accepted", label: "Terima" },
  { value: "edited", label: "Ubah" },
  { value: "rejected", label: "Tolak" },
];

function parseAI(evaluation: AIEvaluation | null | undefined): Map<string, AICriterion> {
  const list = Array.isArray(evaluation?.perCriterionScore)
    ? (evaluation?.perCriterionScore as AICriterion[])
    : [];
  return new Map(list.map((c) => [c.criterionId, c]));
}

function toNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function weightedTotal(
  criteria: RubricCriterion[],
  scores: Map<string, number>,
  maxScore: number,
): number {
  const totalWeight = criteria.reduce((sum, c) => sum + Math.max(0, c.weight), 0);
  let total = 0;
  for (const c of criteria) {
    if (c.maxScore <= 0) continue;
    const share = totalWeight > 0 ? Math.max(0, c.weight) / totalWeight : 1 / criteria.length;
    total += share * (Math.min(scores.get(c.id) ?? 0, c.maxScore) / c.maxScore) * maxScore;
  }
  return Math.round(total * 100) / 100;
}

function initialStates(
  criteria: RubricCriterion[],
  ai: Map<string, AICriterion>,
  previous?: CriterionFinal[] | null,
): Record<string, CriterionState> {
  const prev = new Map((previous ?? []).map((p) => [p.criterionId, p]));
  const out: Record<string, CriterionState> = {};
  for (const c of criteria) {
    const p = prev.get(c.id);
    if (p) {
      out[c.id] = {
        decision: p.decision,
        score: String(p.finalScore),
        feedback: p.finalFeedback ?? "",
      };
    } else {
      out[c.id] = { decision: ai.has(c.id) ? null : "manual", score: "", feedback: "" };
    }
  }
  return out;
}

function scrollBehavior(): ScrollBehavior {
  if (typeof window === "undefined") return "auto";
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

// ─── Component ────────────────────────────────────────────────────────────

export function AIReviewPanel({
  submissionId,
  submissionVersionId,
  releasedGradeId,
  classId,
  maxScore,
  studentName,
  submissionType,
  submissionContent,
  fileName,
  fileUrl,
  rawOcrText,
  isEdited = false,
  pages = [],
  rubricCriteria = [],
  initialAIEvaluation,
  initialGrade,
}: AIReviewPanelProps) {
  const router = useRouter();
  const {
    grading,
    currentStep,
    error: streamError,
    startGrading,
    cancelGrading,
  } = useAIGradingStream();

  const content = submissionContent ?? "";
  const hasRubric = rubricCriteria.length > 0;

  const [evaluation, setEvaluation] = useState<AIEvaluation | null>(initialAIEvaluation ?? null);
  const ai = useMemo(() => parseAI(evaluation), [evaluation]);
  const [states, setStates] = useState<Record<string, CriterionState>>(() =>
    initialStates(rubricCriteria, parseAI(initialAIEvaluation), initialGrade?.perCriterionFinal),
  );
  const [manualTotal, setManualTotal] = useState<string>(
    initialGrade && !hasRubric ? String(initialGrade.finalScore) : "",
  );
  const [finalFeedback, setFinalFeedback] = useState(initialGrade?.finalFeedback ?? "");
  const [changeReason, setChangeReason] = useState("");
  const [expectedReleasedGradeId, setExpectedReleasedGradeId] = useState(releasedGradeId);
  const [isReleased, setIsReleased] = useState(Boolean(initialGrade));
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [status, setStatus] = useState<AIStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/ai/status", { cache: "no-store" })
      .then((r) => r.json().catch(() => ({})))
      .then((data: AIStatus) => {
        if (!cancelled) setStatus(data);
      })
      .catch(() => {
        if (!cancelled)
          setStatus({ ready: false, message: "Status layanan AI tidak dapat dibaca." });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Evidence spans for highlighting (only quotes that really match the current text).
  const spans: EvidenceSpan[] = useMemo(() => {
    const out: EvidenceSpan[] = [];
    rubricCriteria.forEach((c, idx) => {
      (ai.get(c.id)?.evidence ?? []).forEach((ev, j) => {
        if (content.slice(ev.start, ev.end) === ev.quote) {
          out.push({ key: `c${idx + 1}-${j}`, start: ev.start, end: ev.end, criterion: idx + 1 });
        }
      });
    });
    return out;
  }, [ai, content, rubricCriteria]);

  const focusEvidence = useCallback((key: string) => {
    setActiveKey(key);
    document
      .querySelector(`[data-evidence-keys~="${key}"]`)
      ?.scrollIntoView({ block: "center", behavior: scrollBehavior() });
  }, []);

  const onMarkClick = useCallback((key: string, criterion: number) => {
    setActiveKey(key);
    document
      .getElementById(`criterion-${criterion}`)
      ?.scrollIntoView({ block: "nearest", behavior: scrollBehavior() });
  }, []);

  // ─── Scores ─────────────────────────────────────────────────────────────
  const finalScores = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of rubricCriteria) {
      const n = toNumber(states[c.id]?.score ?? "");
      if (n !== null) m.set(c.id, n);
    }
    return m;
  }, [rubricCriteria, states]);

  const total = hasRubric
    ? weightedTotal(rubricCriteria, finalScores, maxScore)
    : (toNumber(manualTotal) ?? 0);
  const aiTotal = evaluation?.suggestedTotalScore ?? null;
  const delta = aiTotal !== null && hasRubric ? Math.round((total - aiTotal) * 100) / 100 : null;

  const undecided = rubricCriteria.filter((c) => {
    const s = states[c.id];
    return !s || s.decision === null || toNumber(s.score) === null;
  });
  const outOfRange = rubricCriteria.filter((c) => {
    const n = finalScores.get(c.id);
    return n !== undefined && (n < 0 || n > c.maxScore);
  });

  const setCriterion = (id: string, patch: Partial<CriterionState>) =>
    setStates((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? { decision: null, score: "", feedback: "" }), ...patch },
    }));

  const choose = (c: RubricCriterion, decision: Exclude<Decision, "manual">) => {
    const suggestion = ai.get(c.id);
    const current = states[c.id];
    if (decision === "accepted" && suggestion) {
      setCriterion(c.id, {
        decision,
        score: String(suggestion.score),
        feedback: current?.feedback || suggestion.feedback || "",
      });
    } else if (decision === "rejected") {
      setCriterion(c.id, { decision, score: "" });
    } else {
      setCriterion(c.id, {
        decision,
        score: current?.score || (suggestion ? String(suggestion.score) : ""),
        feedback: current?.feedback || suggestion?.feedback || "",
      });
    }
  };

  const onScoreChange = (c: RubricCriterion, value: string) => {
    const suggestion = ai.get(c.id);
    let decision = states[c.id]?.decision ?? (suggestion ? null : "manual");
    if (suggestion && (decision === "accepted" || decision === null) && value.trim() !== "") {
      decision = toNumber(value) === suggestion.score ? "accepted" : "edited";
    }
    setCriterion(c.id, { score: value, decision });
  };

  const acceptAll = () => {
    setStates((prev) => {
      const next = { ...prev };
      for (const c of rubricCriteria) {
        const s = ai.get(c.id);
        if (!s) continue;
        next[c.id] = {
          decision: "accepted",
          score: String(s.score),
          feedback: prev[c.id]?.feedback || s.feedback || "",
        };
      }
      return next;
    });
  };

  const composeFeedback = () => {
    const lines = rubricCriteria
      .map((c) => {
        const text = (states[c.id]?.feedback || "").trim();
        return text ? `${c.label}: ${text}` : null;
      })
      .filter(Boolean);
    const intro = evaluation?.suggestedFeedback?.trim();
    setFinalFeedback([intro, ...lines].filter(Boolean).join("\n\n"));
  };

  // ─── AI run ─────────────────────────────────────────────────────────────
  const runAI = async () => {
    setSaveSuccess(false);
    try {
      const result = (await startGrading(submissionId)) as { aiEvaluation?: AIEvaluation } | null;
      if (!result?.aiEvaluation) return;
      setEvaluation(result.aiEvaluation);
      // Scores the lecturer typed themselves (edited/rejected/manual) are kept. "Accepted" meant
      // "take the old draft's value", so those criteria wait for a new decision on the new draft.
      const fresh = parseAI(result.aiEvaluation);
      setStates((prev) => {
        const next = { ...prev };
        for (const c of rubricCriteria) {
          const s = next[c.id];
          if (
            !s ||
            s.decision === null ||
            s.decision === "accepted" ||
            (s.decision === "manual" && s.score === "")
          ) {
            next[c.id] = { decision: fresh.has(c.id) ? null : "manual", score: "", feedback: "" };
          }
        }
        return next;
      });
      router.refresh();
    } catch {
      // the hook exposes the error message
    }
  };

  // ─── Release ────────────────────────────────────────────────────────────
  const validate = (): string | null => {
    if (hasRubric) {
      if (undecided.length > 0)
        return `Lengkapi skor final untuk: ${undecided.map((c) => c.label).join(", ")}.`;
      if (outOfRange.length > 0) {
        return `Skor di luar rentang untuk: ${outOfRange.map((c) => `${c.label} (0–${c.maxScore})`).join(", ")}.`;
      }
    } else {
      const n = toNumber(manualTotal);
      if (n === null || n < 0 || n > maxScore) return `Nilai harus antara 0 dan ${maxScore}.`;
    }
    if (finalFeedback.trim().length < 3)
      return "Tulis umpan balik untuk mahasiswa (minimal 3 karakter).";
    return null;
  };

  const requestRelease = () => {
    setSaveSuccess(false);
    const problem = validate();
    setSaveError(problem);
    if (!problem) setConfirming(true);
  };

  const release = async () => {
    setSaving(true);
    setSaveError(null);
    const perCriterion = hasRubric
      ? rubricCriteria.map((c) => {
          const s = states[c.id];
          const suggestion = ai.get(c.id);
          return {
            criterionId: c.id,
            aiScore: suggestion?.score ?? null,
            finalScore: finalScores.get(c.id) ?? 0,
            decision: (s?.decision ?? "manual") as Decision,
            aiFeedback: suggestion?.feedback ?? null,
            finalFeedback: s?.feedback?.trim() || null,
          };
        })
      : undefined;
    const editedFromAI = Boolean(
      perCriterion?.some((p) => p.decision === "edited" || p.decision === "rejected") ||
        (evaluation && finalFeedback.trim() !== (evaluation.suggestedFeedback ?? "").trim()),
    );

    try {
      const res = await fetch(`/api/submissions/${submissionId}/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedSubmissionVersionId: submissionVersionId,
          expectedReleasedGradeId,
          finalScore: total,
          finalFeedback: finalFeedback.trim(),
          isAIAssisted: Boolean(evaluation),
          editedFromAI,
          evaluationRunId: evaluation?.id ?? null,
          perCriterion,
          changeReason: isReleased && changeReason.trim() ? changeReason.trim() : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(getErrorMessage(data, "Nilai gagal dirilis."));
      setExpectedReleasedGradeId(data.grade.id);
      setIsReleased(true);
      setSaveSuccess(true);
      setConfirming(false);
      setChangeReason("");
      router.refresh();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Nilai gagal dirilis.");
      setConfirming(false);
    } finally {
      setSaving(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────
  const config = evaluation?.evaluatorConfig ?? null;
  const modelName = config?.model || status?.model;
  const isLocal = config?.provider ? config.provider === "ollama" : status?.local;
  const anonymized = config?.anonymized ?? status?.anonymized;
  const progress =
    currentStep?.progress ?? (currentStep ? (currentStep.step / currentStep.totalSteps) * 100 : 0);
  const aiCount = rubricCriteria.filter((c) => ai.has(c.id)).length;
  const modelLine = [
    modelName,
    isLocal === undefined ? null : isLocal ? "lokal" : "cloud",
    anonymized ? "identitas disamarkan" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:gap-6">
      <div className="lg:sticky lg:top-[72px] lg:flex lg:max-h-[calc(100dvh-88px)] lg:flex-col">
        <AnswerViewer
          submissionId={submissionId}
          versionId={submissionVersionId}
          studentName={studentName}
          submissionType={submissionType}
          content={content}
          rawOcrText={rawOcrText}
          isEdited={Boolean(isEdited)}
          pages={pages}
          fileName={fileName}
          hasFile={Boolean(fileUrl)}
          spans={spans}
          activeKey={activeKey}
          onMarkClick={onMarkClick}
        />
      </div>

      <div className="min-w-0 space-y-4">
        {/* AI draft bar */}
        <section
          aria-labelledby="ai-draft-heading"
          className="rounded-xl border border-border bg-card p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id="ai-draft-heading" className="text-base font-semibold">
                Draf AI
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {modelLine || "Model belum diketahui"}
              </p>
              {!grading && status && (
                <p
                  className={cn(
                    "mt-1 text-xs",
                    status.ready ? "text-success-fg" : "text-warning-fg",
                  )}
                >
                  {status.ready ? "Layanan AI siap" : status.message || "Layanan AI belum siap"}
                </p>
              )}
            </div>
            {hasRubric &&
              (grading ? (
                <button
                  type="button"
                  onClick={cancelGrading}
                  className="min-h-10 rounded-lg border border-border px-4 text-sm font-medium hover:bg-muted"
                >
                  Batalkan
                </button>
              ) : (
                <button
                  type="button"
                  onClick={runAI}
                  className={cn(
                    "min-h-10 rounded-lg px-4 text-sm font-semibold",
                    evaluation
                      ? "border border-border hover:bg-muted"
                      : "bg-primary text-primary-foreground hover:bg-primary/90",
                  )}
                >
                  {evaluation ? "Jalankan ulang AI" : "Jalankan AI"}
                </button>
              ))}
          </div>

          {grading && currentStep && (
            <div className="mt-3" role="status" aria-live="polite">
              <div className="flex items-center gap-2 text-sm">
                <Loader2
                  size={15}
                  className="animate-spin text-muted-foreground"
                  aria-hidden="true"
                />
                <span>{currentStep.message}</span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-muted" aria-hidden="true">
                <div
                  className="h-1.5 rounded-full bg-primary transition-[width] duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Model lokal bisa membutuhkan beberapa menit. Anda boleh mulai membaca jawaban.
              </p>
            </div>
          )}

          {streamError && !grading && (
            <div
              role="alert"
              className="mt-3 rounded-lg border border-danger-border bg-danger-bg px-3 py-2.5 text-sm text-danger-fg"
            >
              <p>{streamError}</p>
              <p className="mt-1 text-xs">Anda tetap dapat menilai secara manual di bawah.</p>
            </div>
          )}

          {evaluation && !grading && (
            <p className="mt-3 text-xs text-muted-foreground">
              Saran AI untuk {aiCount} dari {rubricCriteria.length} kriteria
              {aiTotal !== null && (
                <>
                  {" "}
                  · total saran <span className="tabular">{fmt(aiTotal)}</span>/{maxScore}
                </>
              )}
              {config?.unverifiedQuotesDropped
                ? ` · ${config.unverifiedQuotesDropped} kutipan tidak ditemukan di jawaban dan dibuang`
                : ""}
              {config?.retrievalMode === "lexical" ? " · pencarian bukti mode leksikal" : ""}
            </p>
          )}
        </section>

        {/* Criteria */}
        {hasRubric ? (
          <section
            aria-labelledby="criteria-heading"
            className="rounded-xl border border-border bg-card"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
              <h2 id="criteria-heading" className="text-base font-semibold">
                Penilaian per kriteria
              </h2>
              {aiCount > 0 && (
                <button
                  type="button"
                  onClick={acceptAll}
                  className="min-h-9 rounded-lg border border-border px-3 text-sm font-medium hover:bg-muted"
                >
                  Terima semua saran
                </button>
              )}
            </div>

            <ol className="divide-y divide-border">
              {rubricCriteria.map((c, idx) => {
                const n = idx + 1;
                const suggestion = ai.get(c.id);
                const state = states[c.id] ?? { decision: null, score: "", feedback: "" };
                const scoreValue = toNumber(state.score);
                const invalid = scoreValue !== null && (scoreValue < 0 || scoreValue > c.maxScore);
                const evidence = (suggestion?.evidence ?? [])
                  .map((ev, j) => ({ ev, key: `c${n}-${j}` }))
                  .filter(({ ev }) => content.slice(ev.start, ev.end) === ev.quote);
                return (
                  <li key={c.id} id={`criterion-${n}`} className="scroll-mt-20 space-y-3 px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold">
                          <span className="tabular mr-1 text-muted-foreground">{n}.</span>
                          {c.label}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Bobot {fmt(c.weight)} · maks {fmt(c.maxScore)}
                          {c.description ? ` · ${c.description}` : ""}
                        </p>
                      </div>
                      {suggestion && (
                        <div className="shrink-0 text-right">
                          <p className="text-xs text-muted-foreground">Saran AI</p>
                          <p className="tabular text-base font-semibold">
                            {fmt(suggestion.score)}
                            <span className="text-sm font-normal text-muted-foreground">
                              /{fmt(c.maxScore)}
                            </span>
                          </p>
                        </div>
                      )}
                    </div>

                    {suggestion && (suggestion.confidence || suggestion.needsReview) && (
                      <div className="flex flex-wrap gap-1.5">
                        {suggestion.confidence && (
                          <span
                            className={cn(
                              "rounded-md border px-2 py-0.5 text-xs",
                              confidenceClass[suggestion.confidence],
                            )}
                          >
                            {confidenceLabel[suggestion.confidence]}
                          </span>
                        )}
                        {suggestion.needsReview && (
                          <span className="rounded-md border border-warning-border bg-warning-bg px-2 py-0.5 text-xs text-warning-fg">
                            {evidence.length === 0
                              ? "Tanpa bukti, periksa manual"
                              : "Perlu ditinjau"}
                          </span>
                        )}
                      </div>
                    )}

                    {evidence.length > 0 && (
                      <ul className="space-y-1.5" aria-label={`Kutipan bukti kriteria ${n}`}>
                        {evidence.map(({ ev, key }) => (
                          <li key={key}>
                            <button
                              type="button"
                              onClick={() => focusEvidence(key)}
                              aria-pressed={activeKey === key}
                              className={cn(
                                "w-full rounded-md border-l-2 border-evidence-strong px-3 py-1.5 text-left text-sm",
                                activeKey === key
                                  ? "bg-evidence-active"
                                  : "bg-evidence hover:bg-evidence-active",
                              )}
                            >
                              “{ev.quote}”
                              {ev.relevance && (
                                <span className="mt-0.5 block text-xs text-muted-foreground">
                                  {ev.relevance}
                                </span>
                              )}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}

                    {suggestion && (suggestion.reasoning || suggestion.feedback) && (
                      <details className="text-sm">
                        <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
                          Lihat alasan AI
                        </summary>
                        <div className="mt-2 space-y-2 rounded-md bg-muted px-3 py-2 text-sm">
                          {suggestion.reasoning && <p>{suggestion.reasoning}</p>}
                          {suggestion.feedback && (
                            <p className="text-muted-foreground">
                              <span className="font-medium text-foreground">
                                Saran umpan balik:{" "}
                              </span>
                              {suggestion.feedback}
                            </p>
                          )}
                        </div>
                      </details>
                    )}

                    <div className="flex flex-wrap items-end gap-3">
                      {suggestion && (
                        <fieldset className="inline-flex rounded-lg border border-border p-0.5">
                          <legend className="sr-only">Keputusan untuk {c.label}</legend>
                          {decisionOptions.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => choose(c, opt.value)}
                              aria-pressed={state.decision === opt.value}
                              className={cn(
                                "min-h-9 rounded-md px-3 text-sm",
                                state.decision === opt.value
                                  ? "bg-primary font-medium text-primary-foreground"
                                  : "text-muted-foreground hover:text-foreground",
                              )}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </fieldset>
                      )}
                      <div className="space-y-1">
                        <label
                          htmlFor={`score-${c.id}`}
                          className="block text-xs text-muted-foreground"
                        >
                          Skor final
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            id={`score-${c.id}`}
                            type="number"
                            inputMode="decimal"
                            min={0}
                            max={c.maxScore}
                            step="any"
                            value={state.score}
                            onChange={(e) => onScoreChange(c, e.target.value)}
                            aria-invalid={invalid || undefined}
                            className={cn(
                              "tabular h-10 w-20 rounded-lg border bg-card px-2 text-right text-sm",
                              invalid ? "border-danger-fg" : "border-input",
                            )}
                          />
                          <span className="tabular text-sm text-muted-foreground">
                            / {fmt(c.maxScore)}
                          </span>
                        </div>
                      </div>
                    </div>
                    {invalid && (
                      <p className="text-xs text-danger-fg">
                        Skor harus antara 0 dan {fmt(c.maxScore)}.
                      </p>
                    )}

                    <div className="space-y-1">
                      <label
                        htmlFor={`feedback-${c.id}`}
                        className="block text-xs text-muted-foreground"
                      >
                        Catatan untuk mahasiswa (opsional)
                      </label>
                      <textarea
                        id={`feedback-${c.id}`}
                        rows={2}
                        value={state.feedback}
                        onChange={(e) => setCriterion(c.id, { feedback: e.target.value })}
                        className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm"
                      />
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        ) : (
          <section className="rounded-xl border border-warning-border bg-warning-bg p-4 text-sm text-warning-fg">
            <p className="font-medium">Tugas ini belum memakai rubrik.</p>
            <p className="mt-1">
              Draf AI memerlukan rubrik. Beri nilai total secara manual, atau{" "}
              <a href={`/classes/${classId}/rubrics`} className="underline underline-offset-4">
                kelola rubrik kelas
              </a>
              .
            </p>
          </section>
        )}

        {/* Decision */}
        <section
          aria-labelledby="decision-heading"
          className="rounded-xl border border-border bg-card p-4"
        >
          <h2 id="decision-heading" className="text-base font-semibold">
            Nilai akhir
          </h2>

          {hasRubric ? (
            <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm text-muted-foreground">Total berbobot</p>
              <p className="tabular text-2xl font-semibold" aria-live="polite">
                {fmt(total)}
                <span className="text-base font-normal text-muted-foreground"> / {maxScore}</span>
              </p>
              {delta !== null && (
                <p className="tabular w-full text-right text-xs text-muted-foreground">
                  {delta === 0
                    ? "Sama dengan saran AI"
                    : `${delta > 0 ? "+" : "−"}${fmt(Math.abs(delta))} dari saran AI (${fmt(aiTotal ?? 0)})`}
                </p>
              )}
              {undecided.length > 0 && (
                <p className="w-full text-xs text-muted-foreground">
                  {undecided.length} kriteria belum punya skor final.
                </p>
              )}
            </div>
          ) : (
            <div className="mt-3 space-y-1">
              <label htmlFor="final-score" className="block text-sm font-medium">
                Nilai total
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="final-score"
                  type="number"
                  min={0}
                  max={maxScore}
                  step="any"
                  value={manualTotal}
                  onChange={(e) => setManualTotal(e.target.value)}
                  className="tabular h-11 w-28 rounded-lg border border-input bg-card px-3 text-right"
                />
                <span className="tabular text-sm text-muted-foreground">/ {maxScore}</span>
              </div>
            </div>
          )}

          <div className="mt-4 space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="final-feedback" className="text-sm font-medium">
                Umpan balik untuk mahasiswa
              </label>
              {hasRubric && (
                <button
                  type="button"
                  onClick={composeFeedback}
                  className="text-xs font-medium text-primary underline underline-offset-4"
                >
                  Susun dari saran per kriteria
                </button>
              )}
            </div>
            <textarea
              id="final-feedback"
              rows={6}
              value={finalFeedback}
              onChange={(e) => setFinalFeedback(e.target.value)}
              className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm leading-relaxed"
            />
            <p className="text-xs text-muted-foreground">
              Mahasiswa hanya melihat nilai dan umpan balik yang Anda rilis.
            </p>
          </div>

          {isReleased && (
            <div className="mt-3 space-y-1">
              <label htmlFor="change-reason" className="block text-xs text-muted-foreground">
                Alasan perubahan (opsional, tidak terlihat mahasiswa)
              </label>
              <input
                id="change-reason"
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"
              />
            </div>
          )}

          {saveError && (
            <p
              role="alert"
              className="mt-3 rounded-lg border border-danger-border bg-danger-bg px-3 py-2 text-sm text-danger-fg"
            >
              {saveError}
            </p>
          )}
          {saveSuccess && (
            <p
              role="status"
              className="mt-3 rounded-lg border border-success-border bg-success-bg px-3 py-2 text-sm text-success-fg"
            >
              Nilai dirilis dan sekarang terlihat oleh mahasiswa.
            </p>
          )}

          {confirming ? (
            <div className="mt-4 rounded-lg border border-border bg-muted p-3">
              <p className="text-sm">
                Rilis nilai <span className="tabular font-semibold">{fmt(total)}</span>/{maxScore}{" "}
                untuk {studentName}? Mahasiswa akan langsung melihatnya.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={release}
                  disabled={saving}
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {saving && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
                  Ya, rilis
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={saving}
                  className="min-h-11 rounded-lg border border-border bg-card px-4 text-sm"
                >
                  Batal
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={requestRelease}
              className="mt-4 min-h-11 w-full rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 sm:w-auto"
            >
              {isReleased ? "Perbarui nilai yang dirilis" : "Rilis nilai ke mahasiswa"}
            </button>
          )}
        </section>
      </div>
    </div>
  );
}
