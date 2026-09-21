"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Award,
  CheckCircle2,
  AlertCircle,
  FileText,
  File,
  Loader2,
  Copy,
  Check,
  Send,
  RefreshCw,
  Sliders,
  ChevronDown,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAIGradingStream } from "@/hooks/useAIGradingStream";

interface CriterionScore {
  criterionId: string;
  score: number;
  reasoning: string;
}

interface RubricCriterion {
  id: string;
  label: string;
  description?: string | null;
  maxScore: number;
  weight: number;
}

interface AIReviewPanelProps {
  submissionId: string;
  classId: string;
  assignmentId: string;
  assignmentTitle: string;
  maxScore: number;
  studentName: string;
  submissionType: "TEXT" | "PDF" | "DOCX" | "ANY" | string;
  submissionContent?: string | null;
  fileName?: string | null;
  fileUrl?: string | null;
  rubricCriteria?: RubricCriterion[];
  initialAIEvaluation?: {
    suggestedTotalScore: number;
    suggestedFeedback: string;
    perCriterionScore: CriterionScore[] | unknown;
    tokenUsage?: { promptTokens?: number; completionTokens?: number } | unknown;
  } | null;
  initialGrade?: {
    finalScore: number;
    finalFeedback: string;
    isAIAssisted: boolean;
    editedFromAI: boolean;
    gradedAt: Date | string;
  } | null;
}

export function AIReviewPanel({
  submissionId,
  classId,
  assignmentId,
  assignmentTitle,
  maxScore,
  studentName,
  submissionType,
  submissionContent,
  fileName,
  rubricCriteria = [],
  initialAIEvaluation,
  initialGrade,
}: AIReviewPanelProps) {
  const router = useRouter();
  const { grading, currentStep, error: aiStreamError, startGrading } = useAIGradingStream();

  const [aiEvaluation, setAiEvaluation] = useState(initialAIEvaluation);
  const [finalScore, setFinalScore] = useState<number>(
    initialGrade?.finalScore ?? (initialAIEvaluation?.suggestedTotalScore ?? 0)
  );
  const [finalFeedback, setFinalFeedback] = useState<string>(
    initialGrade?.finalFeedback ?? (initialAIEvaluation?.suggestedFeedback ?? "")
  );
  const [copiedFromAI, setCopiedFromAI] = useState(false);
  const [savingGrade, setSavingGrade] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Parse perCriterionScore safely
  const perCriteria: CriterionScore[] = Array.isArray(aiEvaluation?.perCriterionScore)
    ? (aiEvaluation?.perCriterionScore as CriterionScore[])
    : [];

  const handleStartAIGrading = async () => {
    try {
      const result = (await startGrading(submissionId)) as {
        success: boolean;
        aiEvaluation: typeof initialAIEvaluation;
      } | null;

      if (result?.aiEvaluation) {
        setAiEvaluation(result.aiEvaluation);
        setFinalScore(result.aiEvaluation.suggestedTotalScore);
        setFinalFeedback(result.aiEvaluation.suggestedFeedback);
      }
      router.refresh();
    } catch {
      // handled by hook error
    }
  };

  const handleCopyAISuggestions = () => {
    if (!aiEvaluation) return;
    setFinalScore(aiEvaluation.suggestedTotalScore);
    setFinalFeedback(aiEvaluation.suggestedFeedback);
    setCopiedFromAI(true);
    setTimeout(() => setCopiedFromAI(false), 2000);
  };

  const handleFinalize = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaveSuccess(false);

    if (finalScore < 0 || finalScore > maxScore) {
      setSaveError(`Skor akhir harus antara 0 dan ${maxScore}`);
      return;
    }

    if (!finalFeedback.trim()) {
      setSaveError("Umpan balik untuk mahasiswa tidak boleh kosong");
      return;
    }

    setSavingGrade(true);

    // Check if edited from AI
    const isAIAssisted = !!aiEvaluation;
    const editedFromAI =
      isAIAssisted &&
      (finalScore !== aiEvaluation.suggestedTotalScore ||
        finalFeedback.trim() !== aiEvaluation.suggestedFeedback.trim());

    try {
      const res = await fetch(`/api/submissions/${submissionId}/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          finalScore: Number(finalScore),
          finalFeedback: finalFeedback.trim(),
          isAIAssisted,
          editedFromAI,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal memfinalisasi nilai");
      }

      setSaveSuccess(true);
      router.refresh();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Terjadi kesalahan server");
    } finally {
      setSavingGrade(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / HITL explanation */}
      <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/15 text-accent flex items-center justify-center font-bold">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold font-display text-foreground">
              Mode Penilaian Human-in-the-Loop (HITL)
            </h4>
            <p className="text-xs text-muted-foreground">
              AI Copilot bertindak sebagai asisten pemeriksa. Nilai dan umpan balik akhir sepenuhnya di tangan Anda sebagai dosen.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {aiEvaluation ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleStartAIGrading}
              disabled={grading}
              className="gap-1.5 text-xs text-accent border-accent/30 hover:bg-accent/10"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${grading ? "animate-spin" : ""}`} />
              Analisis Ulang dengan AI
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleStartAIGrading}
              disabled={grading}
              className="gap-2 text-xs font-semibold bg-accent hover:bg-accent/90 text-white shadow-sm"
            >
              <Sparkles className="w-4 h-4" />
              Mulai Analisis AI
            </Button>
          )}
        </div>
      </div>

      {/* AI Streaming Progress Banner */}
      {grading && currentStep && (
        <div className="p-5 rounded-2xl bg-accent/10 border border-accent/30 space-y-3 animate-pulse">
          <div className="flex items-center justify-between text-xs font-semibold text-accent">
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-accent" />
              Langkah {currentStep.step} dari {currentStep.totalSteps}: {currentStep.message}
            </span>
            <span className="font-mono">AI Memeriksa Jawaban...</span>
          </div>
          <div className="w-full h-1.5 bg-accent/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-500"
              style={{ width: `${(currentStep.step / currentStep.totalSteps) * 100}%` }}
            />
          </div>
        </div>
      )}

      {aiStreamError && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{aiStreamError}</span>
        </div>
      )}

      {/* Two-Column Layout: Left = Student Submission, Right = AI Draft & Dosen Decision */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Student Submission Content (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <h3 className="font-bold font-display text-base text-foreground">
                  Jawaban Mahasiswa
                </h3>
              </div>
              <Badge variant="outline" className="text-xs font-mono">
                {submissionType}
              </Badge>
            </div>

            <div className="text-xs text-muted-foreground">
              Mahasiswa: <strong className="text-foreground">{studentName}</strong>
              {fileName && (
                <div className="mt-1 flex items-center gap-1.5 text-foreground font-mono bg-muted/40 p-2 rounded-lg">
                  <File className="w-4 h-4 text-primary" />
                  <span className="line-clamp-1">{fileName}</span>
                </div>
              )}
            </div>

            {/* Submission Body */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {submissionType === "TEXT" ? "Teks Jawaban:" : "Teks Hasil Ekstraksi Dokumen:"}
              </Label>
              <div className="p-4 rounded-xl bg-muted/30 border border-border/70 text-xs font-sans text-foreground leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto">
                {submissionContent ? (
                  submissionContent
                ) : (
                  <span className="italic text-muted-foreground">
                    Dokumen file tersimpan di server. Klik "Mulai Analisis AI" untuk mengekstrak dan menilai teks secara otomatis.
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: AI Draft (Violet) & Dosen Final Grade (Emerald) (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* AI SUGGESTION DRAFT CARD (Dashed border, Violet accent) */}
          {aiEvaluation ? (
            <div className="p-6 rounded-2xl border-2 border-dashed border-accent/40 bg-gradient-to-br from-accent/5 via-transparent to-transparent space-y-5 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-accent text-white hover:bg-accent text-xs gap-1.5 shadow-xs">
                      <Sparkles className="w-3.5 h-3.5" />
                      Draft Saran AI (Belum Final)
                    </Badge>
                    <span className="text-xs text-muted-foreground">Model: Gemini 2.0 Flash</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Hasil evaluasi otomatis berdasarkan kecocokan instruksi dan kriteria rubrik.
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs text-muted-foreground font-medium">Saran Skor AI</span>
                  <div className="text-2xl font-extrabold font-mono text-accent">
                    {aiEvaluation.suggestedTotalScore}
                    <span className="text-sm text-muted-foreground font-normal"> / {maxScore}</span>
                  </div>
                </div>
              </div>

              {/* Per-Criterion Breakdown */}
              {perCriteria.length > 0 && (
                <div className="space-y-3 pt-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-accent" />
                    Penilaian Per-Kriteria Rubrik:
                  </Label>
                  <div className="space-y-2.5">
                    {perCriteria.map((c, idx) => {
                      const rubricCrit = rubricCriteria.find((r) => r.id === c.criterionId);
                      return (
                        <div
                          key={c.criterionId || idx}
                          className="p-3.5 rounded-xl bg-background/90 border border-accent/20 space-y-1.5 shadow-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-foreground">
                              {rubricCrit ? rubricCrit.label : `Kriteria #${idx + 1}`}
                            </span>
                            <Badge variant="outline" className="text-xs font-mono font-bold text-accent border-accent/30 bg-accent/5">
                              Skor: {c.score} {rubricCrit ? `(Maks ${rubricCrit.maxScore})` : ""}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {c.reasoning}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Overall AI Feedback */}
              <div className="p-4 rounded-xl bg-background/90 border border-accent/20 space-y-1.5">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-accent" />
                  Saran Narasi Umpan Balik AI:
                </span>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {aiEvaluation.suggestedFeedback}
                </p>
              </div>

              {/* Copy to Final Button */}
              <div className="flex justify-end pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyAISuggestions}
                  className="gap-2 text-xs border-accent/40 text-accent hover:bg-accent/10"
                >
                  {copiedFromAI ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Tersalin ke Form Final</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Semua Saran AI ke Keputusan Dosen</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-2xl border-2 border-dashed border-border text-center bg-muted/20 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-accent/10 text-accent flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold font-display text-foreground">
                Belum Dianalisis oleh AI Copilot
              </h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Klik tombol di bawah untuk meminta AI mengevaluasi jawaban mahasiswa terhadap rubrik penilaian secara instan.
              </p>
              <Button
                onClick={handleStartAIGrading}
                disabled={grading}
                className="gap-2 bg-accent hover:bg-accent/90 text-white font-semibold shadow-sm"
              >
                {grading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sedang Menganalisis...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Mulai Koreksi AI Sekarang
                  </>
                )}
              </Button>
            </div>
          )}

          {/* DOSEN FINAL GRADE & DECISION FORM (Solid border, Emerald/Teal accent) */}
          <form
            onSubmit={handleFinalize}
            className="p-6 rounded-2xl border-2 border-emerald-500/40 bg-card shadow-sm space-y-5"
          >
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-600 text-white hover:bg-emerald-600 text-xs gap-1.5 shadow-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Keputusan & Nilai Final Dosen
                </Badge>
                {initialGrade && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                    (Sudah Dipublikasikan)
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground">Keputusan Mutlak Dosen</span>
            </div>

            {saveError && (
              <div className="p-3.5 text-sm rounded-xl bg-destructive/10 border border-destructive/20 text-destructive font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{saveError}</span>
              </div>
            )}

            {saveSuccess && (
              <div className="p-3.5 text-sm rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>Nilai final berhasil disimpan dan dipublikasikan ke mahasiswa!</span>
              </div>
            )}

            {/* Final Score Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="finalScore" className="text-sm font-bold text-foreground">
                  Nilai Akhir Mahasiswa <span className="text-destructive">*</span>
                </Label>
                <span className="text-xs font-mono text-muted-foreground">
                  Maksimal {maxScore} Poin
                </span>
              </div>
              <div className="relative">
                <Input
                  id="finalScore"
                  type="number"
                  min="0"
                  max={maxScore}
                  step="0.5"
                  value={finalScore}
                  onChange={(e) => setFinalScore(Number(e.target.value))}
                  required
                  disabled={savingGrade}
                  className="font-mono text-xl font-bold text-emerald-600 dark:text-emerald-400 pr-16 h-12"
                />
                <span className="absolute right-3.5 top-3 text-sm font-semibold text-muted-foreground">
                  / {maxScore}
                </span>
              </div>
            </div>

            {/* Final Feedback Textarea */}
            <div className="space-y-2">
              <Label htmlFor="finalFeedback" className="text-sm font-bold text-foreground">
                Umpan Balik Resmi untuk Mahasiswa <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="finalFeedback"
                placeholder="Tuliskan catatan apresiasi, koreksi konstruktif, serta saran pengembangan untuk mahasiswa ini..."
                rows={5}
                value={finalFeedback}
                onChange={(e) => setFinalFeedback(e.target.value)}
                required
                disabled={savingGrade}
                className="text-sm leading-relaxed"
              />
              <p className="text-[11px] text-muted-foreground">
                Mahasiswa hanya akan melihat nilai dan umpan balik final ini di portal mereka.
              </p>
            </div>

            {/* Finalize Button */}
            <div className="pt-2 flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                {aiEvaluation && finalScore !== aiEvaluation.suggestedTotalScore && (
                  <span className="text-amber-500 font-medium">
                    * Anda mengubah saran skor AI
                  </span>
                )}
              </div>

              <Button
                type="submit"
                disabled={savingGrade}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 shadow-sm"
              >
                {savingGrade ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    {initialGrade ? "Perbarui Nilai Final" : "Finalisasi & Publikasikan Nilai"}
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
