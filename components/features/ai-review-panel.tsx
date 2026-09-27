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
  ArrowRight,
  ShieldCheck,
  User,
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
    tokenUsage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number } | unknown;
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
    <div className="space-y-6 pb-12 animate-in fade-in-50 duration-300">
      {/* Top Banner / HITL explanation (Soft Mint Container) */}
      <div className="p-5 rounded-3xl bg-[#E2EFE9] border border-[#C5DDD1] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-[#1E4D3B] text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
            <Sparkles className="w-5 h-5 text-[#FFA07A]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-extrabold font-display text-[#1E4D3B]">
                Mode Penilaian Human-in-the-Loop (HITL)
              </h4>
              <span className="font-mono text-[9px] bg-white text-[#1E4D3B] px-2 py-0.5 rounded-full font-bold shadow-2xs">
                Active Guardian
              </span>
            </div>
            <p className="text-xs text-[#374151] mt-0.5 leading-relaxed">
              AI Copilot bertindak sebagai asisten pemeriksa. Nilai dan umpan balik akhir sepenuhnya di tangan Anda sebagai dosen pengampu.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {aiEvaluation ? (
            <button
              type="button"
              onClick={handleStartAIGrading}
              disabled={grading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#C5DDD1] bg-white text-[#1E4D3B] hover:bg-emerald-50 text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${grading ? "animate-spin" : ""}`} />
              <span>Analisis Ulang AI</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStartAIGrading}
              disabled={grading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1E4D3B] hover:bg-[#15392C] text-white text-xs font-extrabold shadow-xs transition active:scale-[0.98] cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[#FFA07A]" />
              <span>Mulai Analisis AI</span>
            </button>
          )}
        </div>
      </div>

      {/* AI Streaming Progress Banner */}
      {grading && currentStep && (
        <div className="p-5 rounded-3xl bg-[#F4F3ED] border border-[#E5E3D8] space-y-3 animate-pulse shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-[#1E4D3B]">
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#1E4D3B]" />
              Langkah {currentStep.step} dari {currentStep.totalSteps}: {currentStep.message}
            </span>
            <span className="font-mono text-[11px] text-[#6B7280]">AI Memeriksa Jawaban...</span>
          </div>
          <div className="w-full h-2 bg-white rounded-full overflow-hidden border border-[#E5E3D8]">
            <div
              className="h-full bg-[#1E4D3B] transition-all duration-500 rounded-full"
              style={{ width: `${(currentStep.step / currentStep.totalSteps) * 100}%` }}
            />
          </div>
        </div>
      )}

      {aiStreamError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{aiStreamError}</span>
        </div>
      )}

      {/* Two-Column Layout: Left = Student Submission, Right = AI Draft & Dosen Decision */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Student Submission Content (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="p-6 sm:p-7 rounded-3xl border border-[#E5E7EB] bg-white shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-[#F3F4F6] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#E2EFE9] text-[#1E4D3B] flex items-center justify-center font-bold">
                  <FileText className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold font-display text-base text-[#111827]">
                  Jawaban Mahasiswa
                </h3>
              </div>
              <span className="font-mono text-[10px] font-bold px-3 py-1 rounded-full bg-[#F3F4F6] text-[#374151] border border-[#E5E7EB]">
                {submissionType}
              </span>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB]">
              <div className="w-9 h-9 rounded-full bg-[#1E4D3B] text-white font-extrabold flex items-center justify-center text-xs shadow-2xs">
                {studentName.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#111827]">{studentName}</span>
                <span className="text-[11px] text-[#6B7280]">Lembar Jawaban Mahasiswa</span>
              </div>
            </div>

            {fileName && (
              <div className="flex items-center gap-2 text-xs font-mono text-[#374151] bg-[#F3F4F6] p-3 rounded-2xl border border-[#E5E7EB]">
                <File className="w-4 h-4 text-[#1E4D3B]" />
                <span className="truncate">{fileName}</span>
              </div>
            )}

            {/* Submission Body */}
            <div className="space-y-2">
              <Label className="text-[11px] font-extrabold text-[#6B7280] uppercase tracking-wider block">
                {submissionType === "TEXT" ? "Teks Jawaban:" : "Teks Hasil Ekstraksi Dokumen:"}
              </Label>
              <div className="p-4 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB] text-xs font-sans text-[#111827] leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto">
                {submissionContent ? (
                  submissionContent
                ) : (
                  <span className="italic text-[#6B7280]">
                    Dokumen file tersimpan di server. Klik "Mulai Analisis AI" untuk mengekstrak dan menilai teks secara otomatis.
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: AI Draft (Warm Cream) & Dosen Final Grade (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* AI SUGGESTION DRAFT CARD (Dribbble Warm Cream Container #F4F3ED) */}
          {aiEvaluation ? (
            <div className="p-6 sm:p-7 rounded-3xl border border-[#E5E3D8] bg-[#F4F3ED] space-y-5 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1E4D3B] text-white text-xs font-bold shadow-2xs">
                      <Sparkles className="w-3.5 h-3.5 text-[#FFA07A]" />
                      <span>Draft Saran AI Copilot</span>
                    </span>
                    <span className="font-mono text-[10px] text-[#6B7280]">GPT-OSS 120B</span>
                  </div>
                  <p className="text-xs text-[#4B5563] mt-1">
                    Evaluasi otomatis berdasarkan kepatuhan instruksi dan kriteria rubrik.
                  </p>
                  {(aiEvaluation as any).tokenUsage && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#F3F4F6] border border-[#E5E7EB] text-[10px] font-mono font-bold text-[#6B7280]">
                        Total Token: {(aiEvaluation as any).tokenUsage.totalTokens || 0}
                      </span>
                      {(aiEvaluation as any).tokenUsage.totalTokens === 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-100 border border-emerald-200 text-[10px] font-bold text-emerald-700">
                          ⚡ 100% Menggunakan Fast-Pass (Tanpa API AI)
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="text-right bg-white p-3 rounded-2xl border border-[#E5E3D8] shadow-2xs">
                  <span className="text-[10px] text-[#6B7280] font-bold uppercase tracking-wider block">
                    Saran Skor AI
                  </span>
                  <div className="text-2xl font-extrabold font-mono text-[#1E4D3B]">
                    {aiEvaluation.suggestedTotalScore}
                    <span className="text-xs text-[#6B7280] font-normal"> / {maxScore}</span>
                  </div>
                </div>
              </div>

              {/* Per-Criterion Breakdown */}
              {perCriteria.length > 0 && (
                <div className="space-y-3 pt-1">
                  <Label className="text-[11px] font-extrabold text-[#1E4D3B] uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    Penilaian Per-Kriteria Rubrik:
                  </Label>
                  <div className="space-y-2.5">
                    {perCriteria.map((c, idx) => {
                      const rubricCrit = rubricCriteria.find((r) => r.id === c.criterionId);
                      return (
                        <div
                          key={c.criterionId || idx}
                          className="p-4 rounded-2xl bg-white border border-[#E5E3D8] space-y-1.5 shadow-2xs"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-[#111827]">
                                {rubricCrit ? rubricCrit.label : `Kriteria #${idx + 1}`}
                              </span>
                              {c.reasoning.includes("[Auto-Graded]") && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-100 text-amber-700 uppercase tracking-wider">
                                  ⚡ Fast-Pass
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#E2EFE9] text-[#1E4D3B]">
                              Skor: {c.score} {rubricCrit ? `(Maks ${rubricCrit.maxScore})` : ""}
                            </span>
                          </div>
                          <p className="text-xs text-[#4B5563] leading-relaxed">
                            {c.reasoning}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Overall AI Feedback */}
              <div className="p-4 rounded-2xl bg-white border border-[#E5E3D8] space-y-1.5 shadow-2xs">
                <span className="text-xs font-bold text-[#111827] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#FFA07A]" />
                  Saran Narasi Umpan Balik AI:
                </span>
                <p className="text-xs text-[#4B5563] whitespace-pre-wrap leading-relaxed">
                  {aiEvaluation.suggestedFeedback}
                </p>
              </div>

              {/* Copy to Final Button */}
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleCopyAISuggestions}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#1E4D3B] bg-white text-[#1E4D3B] hover:bg-[#E2EFE9] text-xs font-bold transition shadow-2xs cursor-pointer"
                >
                  {copiedFromAI ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Tersalin ke Form Keputusan Dosen</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Semua Saran AI ke Keputusan Dosen</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 sm:p-10 rounded-3xl border-2 border-dashed border-[#E5E7EB] text-center bg-white space-y-4 shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-[#E2EFE9] text-[#1E4D3B] flex items-center justify-center mx-auto shadow-2xs">
                <Sparkles className="w-7 h-7 text-[#1E4D3B]" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-extrabold font-display text-[#111827]">
                  Belum Dianalisis oleh AI Copilot
                </h4>
                <p className="text-xs text-[#6B7280] max-w-sm mx-auto leading-relaxed">
                  Klik tombol di bawah untuk meminta AI mengevaluasi jawaban mahasiswa terhadap rubrik penilaian secara instan.
                </p>
              </div>
              <button
                type="button"
                onClick={handleStartAIGrading}
                disabled={grading}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#1E4D3B] hover:bg-[#15392C] text-white text-xs font-extrabold shadow-xs transition active:scale-[0.98] cursor-pointer"
              >
                {grading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sedang Menganalisis...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-[#FFA07A]" />
                    <span>Mulai Koreksi AI Sekarang</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* DOSEN FINAL GRADE & DECISION FORM */}
          <form
            onSubmit={handleFinalize}
            className="p-6 sm:p-7 rounded-3xl border border-[#E5E7EB] bg-white shadow-xs space-y-5"
          >
            <div className="flex items-center justify-between border-b border-[#F3F4F6] pb-4">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1E4D3B] text-white text-xs font-bold shadow-2xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Keputusan & Nilai Final Dosen</span>
                </span>
                {initialGrade && (
                  <span className="text-xs text-emerald-700 font-bold">
                    (Sudah Dipublikasikan)
                  </span>
                )}
              </div>
              <span className="text-xs text-[#6B7280]">Hak Mutlak Dosen Pengampu</span>
            </div>

            {saveError && (
              <div className="p-3.5 text-xs rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{saveError}</span>
              </div>
            )}

            {saveSuccess && (
              <div className="p-3.5 text-xs rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                <span>Nilai final berhasil disimpan dan dipublikasikan ke mahasiswa!</span>
              </div>
            )}

            {/* Final Score Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="finalScore" className="text-xs font-extrabold text-[#374151]">
                  Nilai Akhir Mahasiswa <span className="text-rose-600">*</span>
                </Label>
                <span className="text-xs font-mono text-[#6B7280]">
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
                  className="font-mono text-xl font-extrabold text-[#1E4D3B] pr-16 h-12 rounded-2xl bg-[#F9FAFB] border-[#E5E7EB] focus:border-[#1E4D3B] focus:bg-white"
                />
                <span className="absolute right-4 top-3.5 text-xs font-bold text-[#6B7280]">
                  / {maxScore}
                </span>
              </div>
            </div>

            {/* Final Feedback Textarea */}
            <div className="space-y-1.5">
              <Label htmlFor="finalFeedback" className="text-xs font-extrabold text-[#374151]">
                Umpan Balik Resmi untuk Mahasiswa <span className="text-rose-600">*</span>
              </Label>
              <Textarea
                id="finalFeedback"
                placeholder="Tuliskan catatan apresiasi, koreksi konstruktif, serta saran pengembangan untuk mahasiswa ini..."
                rows={5}
                value={finalFeedback}
                onChange={(e) => setFinalFeedback(e.target.value)}
                required
                disabled={savingGrade}
                className="text-xs leading-relaxed rounded-2xl bg-[#F9FAFB] border-[#E5E7EB] focus:border-[#1E4D3B] focus:bg-white"
              />
              <p className="text-[11px] text-[#6B7280]">
                Mahasiswa hanya akan melihat nilai dan umpan balik final ini di portal mereka.
              </p>
            </div>

            {/* Finalize Button */}
            <div className="pt-2 flex items-center justify-between">
              <div className="text-xs text-[#6B7280]">
                {aiEvaluation && finalScore !== aiEvaluation.suggestedTotalScore && (
                  <span className="text-amber-600 font-bold">
                    * Anda memodifikasi saran skor AI
                  </span>
                )}
              </div>

              <button
                type="submit"
                disabled={savingGrade}
                className="inline-flex items-center gap-2 bg-[#1E4D3B] hover:bg-[#15392C] text-white font-extrabold text-xs px-7 py-3 rounded-full shadow-xs hover:shadow transition-all disabled:opacity-60 cursor-pointer active:scale-[0.99]"
              >
                {savingGrade ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{initialGrade ? "Perbarui Nilai Final" : "Finalisasi & Publikasikan Nilai"}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
