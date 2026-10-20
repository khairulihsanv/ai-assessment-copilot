"use client";

import {
  AlertCircle,
  AlertTriangle,
  Camera,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Eye,
  File,
  FileText,
  Image as ImageIcon,
  Layers,
  Loader2,
  Maximize2,
  RefreshCw,
  RotateCw,
  Send,
  Sparkles,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

export interface SubmissionPageItem {
  id: string;
  pageNumber: number;
  imageUrl: string;
  imageName?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  extractedText?: string;
  confirmedText?: string;
  ocrStatus?: string;
  ocrError?: string;
  source?: string;
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
  submissionType: "TEXT" | "PDF" | "DOCX" | "SCAN" | "ANY" | string;
  submissionContent?: string | null;
  fileName?: string | null;
  fileUrl?: string | null;
  rawOcrText?: string | null;
  isEdited?: boolean | null;
  ocrStatus?: string | null;
  pageCount?: number | null;
  pages?: SubmissionPageItem[];
  rubricCriteria?: RubricCriterion[];
  initialAIEvaluation?: {
    suggestedTotalScore: number;
    suggestedFeedback: string;
    perCriterionScore: CriterionScore[] | unknown;
    tokenUsage?:
      | {
          promptTokens?: number;
          completionTokens?: number;
          totalTokens?: number;
        }
      | unknown;
  } | null;
  referenceDocuments?: {
    id: string;
    title: string;
    content: string;
    matchScore?: number;
  }[];
  initialGrade?: {
    finalScore: number;
    finalFeedback: string;
    isAIAssisted: boolean;
    editedFromAI: boolean;
    createdAt: Date | string;
  } | null;
}

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
  ocrStatus,
  pageCount,
  pages = [],
  rubricCriteria = [],
  initialAIEvaluation,
  initialGrade,
  referenceDocuments = [],
}: AIReviewPanelProps) {
  const router = useRouter();
  const {
    grading,
    currentStep,
    error: aiStreamError,
    startGrading,
    cancelGrading,
  } = useAIGradingStream();

  const [aiEvaluation, setAiEvaluation] = useState(initialAIEvaluation);
  const [finalScore, setFinalScore] = useState<number>(
    initialGrade?.finalScore ?? initialAIEvaluation?.suggestedTotalScore ?? 0,
  );
  const [finalFeedback, setFinalFeedback] = useState<string>(
    initialGrade?.finalFeedback ?? initialAIEvaluation?.suggestedFeedback ?? "",
  );
  const [copiedFromAI, setCopiedFromAI] = useState(false);
  const [expectedReleasedGradeId, setExpectedReleasedGradeId] = useState(releasedGradeId);
  const [savingGrade, setSavingGrade] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Scan & multi-page document viewer states
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [imageRotation, setImageRotation] = useState<number>(0);
  const [textTab, setTextTab] = useState<"CONFIRMED" | "RAW_OCR" | "PAGE_DIFF">("CONFIRMED");

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 25, 250));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 25, 50));
  const handleResetZoom = () => {
    setZoomLevel(100);
    setImageRotation(0);
  };
  const handleRotateImage = () => {
    setImageRotation((prev) => (prev + 90) % 360);
  };

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
          expectedSubmissionVersionId: submissionVersionId,
          expectedReleasedGradeId,
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

      setExpectedReleasedGradeId(data.grade.id);
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
      <div className="p-5 rounded-lg bg-primary/5 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-none">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0 shadow-none">
            <Sparkles className="w-5 h-5 text-current" />
          </div>
          <div>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h4 className="text-sm font-semibold font-display text-primary">
                Tinjau sebelum merilis
              </h4>
              <span className="font-mono text-[9px] bg-card text-primary px-2 py-0.5 rounded-md font-bold shadow-none">
                Keputusan dosen
              </span>
            </div>
            <p className="text-xs text-foreground mt-0.5 leading-relaxed">
              AI memberi saran koreksi. Nilai dan umpan balik akhir sepenuhnya di tangan Anda
              sebagai dosen pengampu.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {aiEvaluation ? (
            <button
              type="button"
              onClick={handleStartAIGrading}
              disabled={grading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-border bg-card text-primary hover:bg-emerald-50 text-xs font-bold transition shadow-none cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${grading ? "animate-spin" : ""}`} />
              <span>Analisis Ulang AI</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStartAIGrading}
              disabled={grading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-none transition active:scale-[0.98] cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-current" />
              <span>Mulai Analisis AI</span>
            </button>
          )}
        </div>
      </div>

      {(!rubricCriteria || rubricCriteria.length === 0) && (
        <div
          role="status"
          className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-none"
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Tugas ini belum memiliki kriteria rubrik penilaian. Evaluasi AI memerlukan rubrik
              dengan kriteria penilaian sebelum dapat dijalankan.
            </span>
          </div>
          <a
            href={`/classes/${classId}/rubrics`}
            className="font-bold underline text-amber-950 hover:text-amber-800 text-xs shrink-0"
          >
            Kelola Rubrik Kelas
          </a>
        </div>
      )}

      {/* AI Streaming Progress Banner */}
      {grading && currentStep && (
        <div className="p-5 rounded-lg bg-muted/40 border border-border space-y-3 animate-pulse shadow-none">
          <div className="flex items-center justify-between text-xs font-bold text-primary">
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              Langkah {currentStep.step} dari {currentStep.totalSteps}: {currentStep.message}
            </span>
            <div className="flex items-center gap-4">
              <span className="font-mono text-[11px] text-muted-foreground">
                AI Memeriksa Jawaban...
              </span>
              <button
                type="button"
                onClick={cancelGrading}
                className="text-[10px] text-rose-600 border border-rose-200 bg-card px-2 py-1 rounded-md hover:bg-rose-50"
              >
                Batal
              </button>
            </div>
          </div>
          <div className="w-full h-2 bg-card rounded-md overflow-hidden border border-border">
            <div
              className="h-full bg-primary transition-all duration-500 rounded-md"
              style={{
                width: `${(currentStep.step / currentStep.totalSteps) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {aiStreamError && (
        <div
          role="alert"
          className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{aiStreamError}</span>
        </div>
      )}

      {/* Three-Column Layout: Left = Student Submission, Middle = Acuan, Right = AI Draft & Dosen Decision */}
      <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-[minmax(0,1fr)_minmax(0,.85fr)_minmax(0,1.2fr)] gap-4 items-start">
        {/* Left Column: Student Submission Content & Document Viewer */}
        <div className="min-w-0 space-y-5">
          <div className="p-5 rounded-lg border border-border bg-card shadow-none space-y-5">
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary/5 text-primary flex items-center justify-center font-bold">
                  {submissionType === "SCAN" ? (
                    <Camera className="w-4 h-4" />
                  ) : pages.length > 0 ? (
                    <Layers className="w-4 h-4" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                </div>
                <h3 className="font-semibold font-display text-base text-foreground">
                  Jawaban Mahasiswa
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {submissionType === "SCAN" ? (
                  <span className="font-mono text-[10px] font-bold px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                    <Camera className="w-3 h-3" />
                    SCAN JAWABAN ({pages.length || pageCount || 1} Hal)
                  </span>
                ) : pages.length > 0 ? (
                  <span className="font-mono text-[10px] font-bold px-2.5 py-1 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 flex items-center gap-1.5">
                    <Layers className="w-3 h-3" />
                    DOKUMEN SCAN ({pages.length} Hal)
                  </span>
                ) : (
                  <span className="font-mono text-[10px] font-bold px-3 py-1 rounded-md bg-muted text-foreground border border-border">
                    {submissionType}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 p-3.5 rounded-lg bg-muted/40 border border-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-md bg-primary text-primary-foreground font-semibold flex items-center justify-center text-xs shadow-none">
                  {studentName.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-foreground">{studentName}</span>
                  <span className="text-[11px] text-muted-foreground">
                    Lembar Jawaban Mahasiswa
                  </span>
                </div>
              </div>
              {fileUrl && (
                <a
                  href={`/api/submissions/${submissionId}/file`}
                  target="_blank"
                  rel="noreferrer"
                  download={fileName || "jawaban_dokumen.pdf"}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 bg-background hover:bg-muted border border-border px-3 py-1.5 rounded-md transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>
                    {submissionType === "SCAN" ? "Unduh PDF Gabungan" : "Unduh Dokumen Asli"}
                  </span>
                </a>
              )}
            </div>

            {/* MULTI-PAGE SCAN VIEWER */}
            {pages.length > 0 &&
              (() => {
                const activePage = pages[activePageIndex] || pages[0];
                if (!activePage) return null;
                return (
                  <div className="space-y-3 p-3.5 rounded-xl border border-border bg-muted/20">
                    {/* Top Viewer Toolbar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setActivePageIndex((prev) => Math.max(0, prev - 1))}
                          disabled={activePageIndex === 0}
                          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Halaman Sebelumnya"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-semibold text-foreground font-mono">
                          Hal {activePageIndex + 1} / {pages.length}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setActivePageIndex((prev) => Math.min(pages.length - 1, prev + 1))
                          }
                          disabled={activePageIndex >= pages.length - 1}
                          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Halaman Selanjutnya"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Zoom & Rotation Controls */}
                      <div className="flex items-center gap-1 bg-background border border-border rounded-lg p-0.5">
                        <button
                          type="button"
                          onClick={handleZoomOut}
                          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                          title="Perkecil (-)"
                        >
                          <ZoomOut className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={handleResetZoom}
                          className="px-1.5 py-0.5 text-[11px] font-mono text-muted-foreground hover:text-foreground hover:bg-muted rounded"
                          title="Reset Tampilan"
                        >
                          {zoomLevel}%
                        </button>
                        <button
                          type="button"
                          onClick={handleZoomIn}
                          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                          title="Perbesar (+)"
                        >
                          <ZoomIn className="w-3.5 h-3.5" />
                        </button>
                        <div className="w-[1px] h-3 bg-border mx-0.5" />
                        <button
                          type="button"
                          onClick={handleRotateImage}
                          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                          title="Putar 90°"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Thumbnail Row */}
                    {pages.length > 1 && (
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                        {pages.map((p, idx) => (
                          <button
                            key={p.id || idx}
                            type="button"
                            onClick={() => {
                              setActivePageIndex(idx);
                              setImageRotation(0);
                            }}
                            className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-all ${
                              idx === activePageIndex
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "bg-background border border-border text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            H{p.pageNumber}
                            {p.ocrStatus === "ERROR" && (
                              <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-rose-500" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Image Canvas Frame */}
                    <div className="relative overflow-hidden bg-slate-950 rounded-xl border border-border/80 min-h-[300px] max-h-[460px] flex items-center justify-center p-2 select-none">
                      {activePage?.imageUrl ? (
                        <div className="overflow-auto max-h-[440px] w-full flex items-center justify-center">
                          <img
                            src={activePage.imageUrl}
                            alt={`Lembar jawaban halaman ${activePage.pageNumber}`}
                            className="max-w-full max-h-[430px] object-contain transition-transform duration-200"
                            style={{
                              transform: `scale(${zoomLevel / 100}) rotate(${imageRotation}deg)`,
                            }}
                          />
                        </div>
                      ) : (
                        <div className="text-center text-slate-400 p-8 space-y-2">
                          <ImageIcon className="w-8 h-8 mx-auto opacity-50" />
                          <p className="text-xs">Gambar halaman tidak tersedia.</p>
                        </div>
                      )}
                    </div>

                    {/* Page Metadata Chip */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground font-mono px-1">
                      <div className="flex items-center gap-3">
                        {activePage.width && activePage.height && (
                          <span>
                            Dimensi: {activePage.width} × {activePage.height}px
                          </span>
                        )}
                        <span>Sumber: {activePage.source || "SCAN"}</span>
                      </div>
                      <div>
                        {activePage.ocrStatus === "ERROR" ? (
                          <span className="text-rose-500 font-semibold">Gagal OCR</span>
                        ) : activePage.ocrStatus === "SUCCESS" ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            OCR Sukses
                          </span>
                        ) : (
                          <span>Status: {activePage.ocrStatus || "OK"}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

            {/* Standard File Info if no scan pages but has file */}
            {pages.length === 0 && fileName && (
              <div className="flex items-center gap-2 text-xs font-mono text-foreground bg-muted p-3 rounded-lg border border-border">
                <File className="w-4 h-4 text-primary" />
                <span className="truncate">{fileName}</span>
              </div>
            )}

            {/* STUDENT TEXT CORRECTION ALERT */}
            {isEdited && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-semibold">Mahasiswa Mengoreksi Teks OCR</span>
                  <p className="text-[11px] opacity-90 leading-relaxed">
                    Mahasiswa mengedit atau melengkapi teks sebelum konfirmasi pengumpulan. AI dan
                    Dosen mengevaluasi berdasarkan <strong>Teks Terkonfirmasi</strong>. Anda dapat
                    melihat hasil OCR asli melalui tab di bawah.
                  </p>
                </div>
              </div>
            )}

            {/* TEXT COMPARISON & SUBMISSION CONTENT */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  {isEdited
                    ? "Komparasi Teks Penilaian:"
                    : submissionType === "TEXT"
                      ? "Teks Jawaban:"
                      : "Teks Hasil Ekstraksi:"}
                </Label>

                {/* Tab Switcher if isEdited or scan submission */}
                {(isEdited || rawOcrText || pages.length > 0) && (
                  <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg border border-border text-[11px]">
                    <button
                      type="button"
                      onClick={() => setTextTab("CONFIRMED")}
                      className={`px-2 py-0.5 rounded font-medium transition-all ${
                        textTab === "CONFIRMED"
                          ? "bg-background text-foreground shadow-sm font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Terkonfirmasi (Aktif)
                    </button>
                    {rawOcrText && (
                      <button
                        type="button"
                        onClick={() => setTextTab("RAW_OCR")}
                        className={`px-2 py-0.5 rounded font-medium transition-all ${
                          textTab === "RAW_OCR"
                            ? "bg-background text-foreground shadow-sm font-semibold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        OCR Asli
                      </button>
                    )}
                    {pages.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setTextTab("PAGE_DIFF")}
                        className={`px-2 py-0.5 rounded font-medium transition-all ${
                          textTab === "PAGE_DIFF"
                            ? "bg-background text-foreground shadow-sm font-semibold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Per-Hal {activePageIndex + 1}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Tab 1: Confirmed Student Text */}
              {textTab === "CONFIRMED" && (
                <div className="p-4 rounded-lg bg-muted/40 border border-border text-sm font-sans text-foreground leading-relaxed break-words whitespace-pre-wrap max-h-[460px] overflow-y-auto">
                  {submissionContent ? (
                    submissionContent
                  ) : (
                    <span className="italic text-muted-foreground">
                      Teks jawaban belum tersedia untuk ditampilkan. Periksa berkas sebelum
                      menentukan nilai.
                    </span>
                  )}
                </div>
              )}

              {/* Tab 2: Raw OCR Text */}
              {textTab === "RAW_OCR" && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                    Teks Mentah Hasil Ekstraksi Mesin OCR (Sebelum Koreksi Mahasiswa):
                  </span>
                  <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs font-mono text-foreground leading-relaxed break-words whitespace-pre-wrap max-h-[460px] overflow-y-auto">
                    {rawOcrText || (
                      <span className="italic text-muted-foreground font-sans">
                        Tidak ada rekaman teks OCR mentah tersimpan untuk versi tugas ini.
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 3: Active Page Detail */}
              {textTab === "PAGE_DIFF" &&
                pages.length > 0 &&
                (() => {
                  const activePage = pages[activePageIndex] || pages[0];
                  if (!activePage) return null;
                  return (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <span className="text-[11px] font-semibold text-foreground">
                          Teks Halaman {activePage.pageNumber} Terkonfirmasi:
                        </span>
                        <div className="p-3 rounded-lg bg-muted/40 border border-border text-xs font-sans text-foreground whitespace-pre-wrap max-h-[180px] overflow-y-auto">
                          {activePage.confirmedText || (
                            <span className="italic text-muted-foreground">(Kosong)</span>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                          Teks Halaman {activePage.pageNumber} OCR Mentah:
                        </span>
                        <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs font-mono text-foreground whitespace-pre-wrap max-h-[180px] overflow-y-auto">
                          {activePage.extractedText || (
                            <span className="italic text-muted-foreground">
                              (Tidak ada teks terbaca)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
            </div>
          </div>
        </div>

        {/* Middle Column: Acuan penilaian (Reference Documents) */}
        <div className="min-w-0 space-y-5">
          <div className="p-5 rounded-lg border border-border bg-card shadow-none space-y-5">
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                  <FileText className="w-4 h-4" />
                </div>
                <h3 className="font-semibold font-display text-base text-foreground">
                  Acuan penilaian
                </h3>
              </div>
              <Badge variant="outline" className="text-xs">
                {referenceDocuments.length} Acuan
              </Badge>
            </div>

            {referenceDocuments.length > 0 ? (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                {referenceDocuments.map((doc, idx) => (
                  <div
                    key={doc.id || idx}
                    className="p-4 rounded-lg bg-muted/40 border border-border space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground flex items-center gap-2">
                        <File className="w-3.5 h-3.5 text-blue-600" />
                        {doc.title}
                      </span>
                      {doc.matchScore && (
                        <span className="text-[10px] font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">
                          Kemiripan: {doc.matchScore}%
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap ">
                      {doc.content}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground bg-muted/40 rounded-lg border border-dashed border-border">
                <FileText className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
                <p className="text-xs">
                  Tidak ada acuan spesifik yang dipetakan atau diunggah untuk tugas ini.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: AI Draft (Warm Cream) & Dosen Final Grade */}
        <div className="min-w-0 space-y-6 lg:col-span-2 2xl:col-span-1">
          {/* AI SUGGESTION DRAFT CARD (Dribbble Warm Cream Container #F4F3ED) */}
          {aiEvaluation ? (
            <div className="p-5 rounded-lg border border-border bg-muted/40 space-y-5 shadow-none">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-primary text-primary-foreground text-xs font-bold shadow-none">
                      <Sparkles className="w-3.5 h-3.5 text-current" />
                      <span>Saran AI</span>
                    </span>
                    <span className="text-xs text-muted-foreground">Belum final</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Evaluasi otomatis berdasarkan kepatuhan instruksi dan kriteria rubrik.
                  </p>
                </div>

                <div className="text-right bg-card p-3 rounded-lg border border-border shadow-none">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">
                    Saran Skor AI
                  </span>
                  <div className="text-2xl font-semibold font-mono text-primary">
                    {aiEvaluation.suggestedTotalScore}
                    <span className="text-xs text-muted-foreground font-normal"> / {maxScore}</span>
                  </div>
                </div>
              </div>

              {/* Per-Criterion Breakdown */}
              {perCriteria.length > 0 && (
                <div className="space-y-3 pt-1">
                  <Label className="text-[11px] font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    Penilaian Per-Kriteria Rubrik:
                  </Label>
                  <div className="space-y-2.5">
                    {perCriteria.map((c, idx) => {
                      const rubricCrit = rubricCriteria.find((r) => r.id === c.criterionId);
                      return (
                        <div
                          key={c.criterionId || idx}
                          className="p-4 rounded-lg bg-card border border-border space-y-1.5 shadow-none"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                              <span className="text-xs font-bold text-foreground">
                                {rubricCrit ? rubricCrit.label : `Kriteria #${idx + 1}`}
                              </span>
                              {c.reasoning.includes("[Auto-Graded]") && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-100 text-amber-700 uppercase tracking-wider">
                                  ⚡ Fast-Pass
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-primary/5 text-primary">
                              Skor: {c.score} {rubricCrit ? `(Maks ${rubricCrit.maxScore})` : ""}
                            </span>
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
              <div className="p-4 rounded-lg bg-card border border-border space-y-1.5 shadow-none">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-current" />
                  Saran Narasi Umpan Balik AI:
                </span>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {aiEvaluation.suggestedFeedback}
                </p>
              </div>

              {/* Copy to Final Button */}
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleCopyAISuggestions}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-primary bg-card text-primary hover:bg-primary/5 text-xs font-bold transition shadow-none cursor-pointer"
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
            <div className="p-8 sm:p-10 rounded-lg border-2 border-dashed border-border text-center bg-card space-y-4 shadow-none">
              <div className="w-14 h-14 rounded-lg bg-primary/5 text-primary flex items-center justify-center mx-auto shadow-none">
                <Sparkles className="w-7 h-7 text-primary" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-semibold font-display text-foreground">
                  Belum ada saran AI
                </h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  Klik tombol di bawah untuk meminta AI mengevaluasi jawaban mahasiswa terhadap
                  rubrik penilaian sebagai bahan tinjauan.
                </p>
              </div>
              <button
                type="button"
                onClick={handleStartAIGrading}
                disabled={grading}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-none transition active:scale-[0.98] cursor-pointer"
              >
                {grading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sedang Menganalisis...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-current" />
                    <span>Mulai Koreksi AI Sekarang</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* DOSEN FINAL GRADE & DECISION FORM */}
          <form
            onSubmit={handleFinalize}
            className="p-5 rounded-lg border border-border bg-card shadow-none space-y-5"
          >
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-primary text-primary-foreground text-xs font-bold shadow-none">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Keputusan & Nilai Final Dosen</span>
                </span>
                {initialGrade && (
                  <span className="text-xs text-emerald-700 font-bold">(Sudah Dipublikasikan)</span>
                )}
              </div>
              <span className="text-xs text-muted-foreground">Hak Mutlak Dosen Pengampu</span>
            </div>

            {saveError && (
              <div className="p-3.5 text-xs rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{saveError}</span>
              </div>
            )}

            {saveSuccess && (
              <div className="p-3.5 text-xs rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                <span>Nilai final berhasil disimpan dan dipublikasikan ke mahasiswa!</span>
              </div>
            )}

            {/* Final Score Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="finalScore" className="text-xs font-semibold text-foreground">
                  Nilai Akhir Mahasiswa <span className="text-rose-600">*</span>
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
                  className="font-mono text-xl font-semibold text-primary pr-16 h-12 rounded-lg bg-muted/40 border-border focus:border-primary focus:bg-card"
                />
                <span className="absolute right-4 top-3.5 text-xs font-bold text-muted-foreground">
                  / {maxScore}
                </span>
              </div>
            </div>

            {/* Final Feedback Textarea */}
            <div className="space-y-1.5">
              <Label htmlFor="finalFeedback" className="text-xs font-semibold text-foreground">
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
                className="text-xs leading-relaxed rounded-lg bg-muted/40 border-border focus:border-primary focus:bg-card"
              />
              <p className="text-[11px] text-muted-foreground">
                Mahasiswa hanya akan melihat nilai dan umpan balik final ini di portal mereka.
              </p>
            </div>

            {/* Finalize Button */}
            <div className="pt-2 flex min-w-0 flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-muted-foreground">
                {aiEvaluation && finalScore !== aiEvaluation.suggestedTotalScore && (
                  <span className="text-amber-600 font-bold">
                    * Anda memodifikasi saran skor AI
                  </span>
                )}
              </div>

              <button
                type="submit"
                disabled={savingGrade}
                className="inline-flex min-h-11 w-full min-w-0 max-w-full items-center justify-center gap-2 whitespace-normal break-words bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs px-5 py-3 rounded-md sm:w-auto shadow-none hover:shadow transition-all disabled:opacity-60 cursor-pointer active:scale-[0.99]"
              >
                {savingGrade ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 shrink-0" />
                    <span>
                      {initialGrade ? "Perbarui Nilai Final" : "Finalisasi & Publikasikan Nilai"}
                    </span>
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
