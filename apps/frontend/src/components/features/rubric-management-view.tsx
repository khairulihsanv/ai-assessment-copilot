"use client";

import {
  BookOpen,
  Brain,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Database,
  Edit3,
  Fingerprint,
  KeyRound,
  Layers,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { RubricEditor } from "@/components/features/rubric-editor";
import { formatDate } from "@/shared/utils";

interface Criterion {
  id: string;
  label: string;
  description?: string | null;
  maxScore: number;
  weight: number;
  answerKey?: string | null;
  material?: string | null;
  answerKeyEmbedding?: unknown | null;
  materialEmbedding?: unknown | null;
}

interface RubricItem {
  id: string;
  title: string;
  createdAt: Date | string;
  criteria: Criterion[];
  _count: { assignments: number };
}

interface RubricManagementViewProps {
  classId: string;
  className: string;
  initialRubrics: RubricItem[];
}

export function RubricManagementView({
  classId,
  className,
  initialRubrics,
}: RubricManagementViewProps) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [editingRubric, setEditingRubric] = useState<RubricItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [thresholdScore, setThresholdScore] = useState(85);
  const [expandedCriteria, setExpandedCriteria] = useState<Record<string, boolean>>({});

  const toggleCriterionExpand = (critId: string) => {
    setExpandedCriteria((prev) => ({
      ...prev,
      [critId]: !prev[critId],
    }));
  };

  const handleDelete = async (id: string, assignmentCount: number) => {
    if (assignmentCount > 0) {
      alert(
        `Rubrik ini sedang dipakai oleh ${assignmentCount} tugas aktif dan tidak dapat dihapus.`,
      );
      return;
    }

    if (!confirm("Apakah Anda yakin ingin menghapus rubrik ini?")) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await fetch(`/api/classes/${classId}/rubrics/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Gagal menghapus rubrik");
      } else {
        router.refresh();
      }
    } catch {
      alert("Terjadi kesalahan jaringan");
    } finally {
      setDeletingId(null);
    }
  };

  // Helper: check if criterion has embedding data
  const hasEmbedding = (criterion: Criterion) => {
    return !!(criterion.answerKeyEmbedding || criterion.materialEmbedding);
  };

  // Helper: truncate text with ellipsis
  const _truncateText = (text: string, maxLen: number) => {
    if (text.length <= maxLen) return text;
    return `${text.slice(0, maxLen)}...`;
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in-50 duration-300">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link
          href={`/classes/${classId}`}
          className="hover:text-primary flex items-center gap-1.5 transition-colors font-medium"
        >
          <ChevronLeft size={14} />
          <span>Kembali ke Kelas {className}</span>
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground">
              Faculty Suite
            </span>
            <span className="font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
              <Brain size={10} /> Vector Embedding AI
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-foreground mt-1.5 flex items-center gap-2.5">
            <Layers className="text-primary" size={26} />
            <span>Rubrik Penilaian Berbasis AI</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Kunci Jawaban & Materi di-embed ke database vektor. AI menilai dengan{" "}
            <strong>cosine similarity</strong> — bukan mengarang. Kelas{" "}
            <strong className="text-foreground">{className}</strong>.
          </p>
        </div>

        {!isCreating && !editingRubric && (
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-none transition-all active:scale-[0.98] cursor-pointer"
          >
            <Plus size={15} />
            <span>Buat Rubrik Baru</span>
          </button>
        )}
      </div>

      {/* AI Vector Embedding Info Banner */}
      <div className="p-5 rounded-xl bg-secondary/50 border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-none">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-none">
            <Database size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground">
                Sistem Penilaian Vector Embedding
              </span>
              <span className="font-mono text-[9px] bg-card border border-border text-primary px-2 py-0.5 rounded-full font-bold">
                Classification + Cosine Similarity
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Setiap Kunci Jawaban dan Materi di-embed menjadi representasi vektor. Saat AI menilai,
              jawaban mahasiswa dibandingkan secara semantik — meminimalkan halusinasi dan menjaga
              objektivitas.
            </p>
          </div>
        </div>
      </div>

      {/* Editor State (Create or Edit) */}
      {isCreating && (
        <RubricEditor
          classId={classId}
          onSuccess={() => {
            setIsCreating(false);
            router.refresh();
          }}
          onCancel={() => setIsCreating(false)}
        />
      )}

      {editingRubric && (
        <RubricEditor
          classId={classId}
          initialData={{
            id: editingRubric.id,
            title: editingRubric.title,
            criteria: editingRubric.criteria.map((c) => ({
              id: c.id,
              label: c.label,
              description: c.description || "",
              maxScore: c.maxScore,
              weight: c.weight,
              answerKey: c.answerKey || "",
              material: c.material || "",
            })),
          }}
          onSuccess={() => {
            setEditingRubric(null);
            router.refresh();
          }}
          onCancel={() => setEditingRubric(null)}
        />
      )}

      {/* Rubrics List */}
      {!isCreating && !editingRubric && (
        <div className="space-y-6">
          {initialRubrics.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-xl border border-dashed border-border bg-card shadow-none">
              <div className="w-14 h-14 rounded-lg bg-secondary flex items-center justify-center text-secondary-foreground mb-3">
                <Layers size={28} />
              </div>
              <h3 className="text-base font-semibold font-display text-foreground">
                Belum Ada Rubrik Penilaian
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-5">
                Buat rubrik dengan Kunci Jawaban dan Materi Referensi agar AI dapat menilai secara
                faktual dan terukur.
              </p>
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 shadow-none cursor-pointer"
              >
                <Plus size={15} />
                <span>Buat Rubrik Pertama</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {initialRubrics.map((r) => {
                // Count how many criteria have answer keys and materials
                const criteriaWithAnswerKey = r.criteria.filter((c) => c.answerKey?.trim()).length;
                const criteriaWithMaterial = r.criteria.filter((c) => c.material?.trim()).length;
                const criteriaWithEmbedding = r.criteria.filter(hasEmbedding).length;

                return (
                  <div
                    key={r.id}
                    className="p-6 sm:p-7 rounded-xl border border-border bg-card hover:border-primary/40 transition-all space-y-5 shadow-none"
                  >
                    {/* Top Bar of Rubric */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
                      <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h3 className="text-lg font-bold font-display text-foreground">
                            {r.title}
                          </h3>
                          <span className="font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                            {r.criteria.length} Kriteria
                          </span>
                          {r._count.assignments > 0 ? (
                            <span className="font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                              Dipakai di {r._count.assignments} tugas aktif
                            </span>
                          ) : (
                            <span className="font-mono text-[10px] px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                              Siap digunakan
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Dibuat pada {formatDate(r.createdAt)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingRubric(r)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-border text-xs font-bold text-secondary-foreground bg-card hover:bg-secondary hover:border-primary/40 transition-all cursor-pointer shadow-none"
                        >
                          <Edit3 size={13} />
                          <span>Edit Rubrik</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(r.id, r._count.assignments)}
                          disabled={deletingId === r.id}
                          className="p-2 rounded-full text-muted-foreground hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Hapus Rubrik"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Embedding Status Summary */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground">
                        <Fingerprint size={12} className="text-primary" />
                        Status Data:
                      </div>
                      <span
                        className={`font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                          criteriaWithAnswerKey === r.criteria.length
                            ? "bg-emerald-100 text-emerald-800"
                            : criteriaWithAnswerKey > 0
                              ? "bg-amber-100 text-amber-800"
                              : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        <KeyRound size={9} />
                        Kunci Jawaban: {criteriaWithAnswerKey}/{r.criteria.length}
                      </span>
                      <span
                        className={`font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                          criteriaWithMaterial === r.criteria.length
                            ? "bg-blue-100 text-blue-800"
                            : criteriaWithMaterial > 0
                              ? "bg-amber-100 text-amber-800"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <BookOpen size={9} />
                        Materi: {criteriaWithMaterial}/{r.criteria.length}
                      </span>
                      <span
                        className={`font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                          criteriaWithEmbedding > 0
                            ? "bg-purple-100 text-purple-800"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Database size={9} />
                        Embedded: {criteriaWithEmbedding}/{r.criteria.length}
                      </span>
                    </div>

                    {/* Criteria Cards — showing answer key & material */}
                    <div className="space-y-3">
                      {r.criteria.map((c, idx) => {
                        const isExpanded = expandedCriteria[c.id] ?? false;
                        const hasKey = !!c.answerKey?.trim();
                        const hasMat = !!c.material?.trim();

                        return (
                          <div
                            key={c.id}
                            className="rounded-lg bg-muted/50 border border-border hover:border-primary/40 transition overflow-hidden"
                          >
                            {/* Criterion Header */}
                            <button
                              type="button"
                              onClick={() => toggleCriterionExpand(c.id)}
                              className="w-full p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-muted transition-colors"
                            >
                              <div className="flex items-start gap-3">
                                <span className="w-7 h-7 rounded-xl bg-primary text-primary-foreground font-mono text-xs font-semibold flex items-center justify-center shrink-0">
                                  {idx + 1}
                                </span>
                                <div className="text-left">
                                  <h4 className="text-sm font-bold text-foreground">{c.label}</h4>
                                  {c.description && (
                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                      {c.description}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span className="font-mono text-xs font-bold px-3 py-1 rounded-full bg-secondary text-secondary-foreground">
                                  {c.weight}%
                                </span>
                                <span className="font-mono text-xs font-bold px-3 py-1 rounded-full bg-card text-muted-foreground border border-border">
                                  Maks {c.maxScore}
                                </span>
                                {hasKey && (
                                  <span
                                    className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center"
                                    title="Kunci Jawaban ✓"
                                  >
                                    <KeyRound size={10} className="text-emerald-700" />
                                  </span>
                                )}
                                {hasMat && (
                                  <span
                                    className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center"
                                    title="Materi ✓"
                                  >
                                    <BookOpen size={10} className="text-blue-700" />
                                  </span>
                                )}
                                {isExpanded ? (
                                  <ChevronUp size={16} className="text-muted-foreground" />
                                ) : (
                                  <ChevronDown size={16} className="text-muted-foreground" />
                                )}
                              </div>
                            </button>

                            {/* Expanded: Show Answer Key & Material Content */}
                            {isExpanded && (
                              <div className="px-4 pb-4 pt-0 space-y-3 border-t border-border">
                                {hasKey && (
                                  <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-1.5 mt-3">
                                    <div className="flex items-center gap-1.5">
                                      <KeyRound size={12} className="text-emerald-700" />
                                      <span className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider">
                                        Kunci Jawaban
                                      </span>
                                      {hasEmbedding(c) && (
                                        <span className="font-mono text-[8px] bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded-full font-bold">
                                          ✓ Embedded
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-foreground leading-relaxed whitespace-pre-wrap">
                                      {c.answerKey}
                                    </p>
                                  </div>
                                )}

                                {hasMat && (
                                  <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-200 space-y-1.5">
                                    <div className="flex items-center gap-1.5">
                                      <BookOpen size={12} className="text-blue-700" />
                                      <span className="text-[10px] font-semibold text-blue-800 uppercase tracking-wider">
                                        Materi Referensi
                                      </span>
                                      {hasEmbedding(c) && (
                                        <span className="font-mono text-[8px] bg-blue-200 text-blue-900 px-1.5 py-0.5 rounded-full font-bold">
                                          ✓ Embedded
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-foreground leading-relaxed whitespace-pre-wrap">
                                      {c.material}
                                    </p>
                                  </div>
                                )}

                                {!hasKey && !hasMat && (
                                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-center mt-3">
                                    <p className="text-[11px] text-amber-800 font-medium">
                                      ⚠️ Belum ada Kunci Jawaban dan Materi untuk kriteria ini. AI
                                      akan menilai berdasarkan instruksi umum saja.
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Human-in-the-Loop Validation Protocol banner */}
          <div className="p-6 rounded-xl bg-secondary border border-border shadow-none space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-primary" />
                <span className="text-xs font-semibold text-primary">
                  Human-in-the-Loop Validation Protocol
                </span>
                <span className="font-mono text-[9px] bg-card text-primary px-2.5 py-0.5 rounded-full font-bold shadow-none">
                  Active Guardrail
                </span>
              </div>
              <span className="font-mono text-xs font-semibold text-primary">
                Confidence Threshold: ≥ {thresholdScore}.0%
              </span>
            </div>

            <p className="text-xs text-foreground leading-relaxed">
              Setiap penilaian AI dengan tingkat keyakinan di bawah ambang batas ini wajib melalui
              telaah manual dosen sebelum diterbitkan ke mahasiswa. Dengan Kunci Jawaban & Materi
              sebagai acuan, AI menghasilkan penilaian yang lebih transparan dan terukur.
            </p>

            <div className="flex items-center gap-3 pt-1">
              <span className="font-mono text-[10px] text-primary font-bold">70%</span>
              <input
                type="range"
                min={70}
                max={95}
                value={thresholdScore}
                onChange={(e) => setThresholdScore(Number(e.target.value))}
                className="w-full accent-primary cursor-pointer"
              />
              <span className="font-mono text-[10px] text-primary font-bold">95%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
