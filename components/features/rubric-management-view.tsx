"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  ChevronLeft,
  Layers,
  Trash2,
  Edit3,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Table,
  LayoutGrid,
  ChevronDown,
  ChevronUp,
  Award,
  BookOpen,
} from "lucide-react";
import { RubricEditor } from "@/components/features/rubric-editor";
import { formatDate } from "@/lib/utils";

interface Criterion {
  id: string;
  label: string;
  description?: string | null;
  maxScore: number;
  weight: number;
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
  // Default to Google Classroom CARDS mode to avoid dense confusing tables!
  const [viewMode, setViewMode] = useState<"CARDS" | "MATRIX">("CARDS");
  const [expandedCriteria, setExpandedCriteria] = useState<Record<string, boolean>>({});

  const toggleCriterionExpand = (critId: string) => {
    setExpandedCriteria((prev) => ({
      ...prev,
      [critId]: !prev[critId],
    }));
  };

  const handleDelete = async (id: string, assignmentCount: number) => {
    if (assignmentCount > 0) {
      alert(`Rubrik ini sedang dipakai oleh ${assignmentCount} tugas aktif dan tidak dapat dihapus.`);
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

  return (
    <div className="space-y-6 pb-12 animate-in fade-in-50 duration-300">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-[#6B7280]">
        <Link
          href={`/classes/${classId}`}
          className="hover:text-[#1E4D3B] flex items-center gap-1.5 transition-colors font-medium"
        >
          <ChevronLeft size={14} />
          <span>Kembali ke Kelas {className}</span>
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB]">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#E2EFE9] text-[#1E4D3B]">
              Faculty Suite
            </span>
            <span className="font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              Standar OBE Capstone
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#111827] mt-1.5 flex items-center gap-2.5">
            <Layers className="text-[#1E4D3B]" size={26} />
            <span>Rubrik Penilaian Terstruktur</span>
          </h1>
          <p className="text-xs text-[#6B7280] mt-1">
            Pedoman kriteria evaluasi objektif berbasis kartu untuk AI Copilot dan Dosen pengampu kelas{" "}
            <strong className="text-[#111827]">{className}</strong>.
          </p>
        </div>

        {!isCreating && !editingRubric && (
          <div className="flex items-center gap-3">
            {/* View Mode Switcher */}
            <div className="flex items-center p-1 bg-white rounded-full border border-[#E5E7EB] shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode("CARDS")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "CARDS"
                    ? "bg-[#1E4D3B] text-white shadow-xs"
                    : "text-[#6B7280] hover:text-[#111827]"
                }`}
                title="Tampilan Kartu Rubrik (Google Classroom style)"
              >
                <LayoutGrid size={14} />
                <span>Kartu Kriteria</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("MATRIX")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "MATRIX"
                    ? "bg-[#1E4D3B] text-white shadow-xs"
                    : "text-[#6B7280] hover:text-[#111827]"
                }`}
                title="Tampilan Tabel Matriks Ringkas"
              >
                <Table size={14} />
                <span>Matriks Ringkas</span>
              </button>
            </div>

            <button
              onClick={() => setIsCreating(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1E4D3B] hover:bg-[#15392C] text-white text-xs font-extrabold shadow-xs transition-all active:scale-[0.98] cursor-pointer"
            >
              <Plus size={15} />
              <span>Buat Rubrik Baru</span>
            </button>
          </div>
        )}
      </div>

      {/* Live AI Rubric Optimizer Banner (Warm Cream Dribbble Container) */}
      <div className="p-5 rounded-3xl bg-[#F4F3ED] border border-[#E5E3D8] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-[#1E4D3B] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles size={18} className="text-[#FFA07A]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-[#111827]">
                Pedoman Rubrik AI Terverifikasi
              </span>
              <span className="font-mono text-[9px] bg-white border border-[#E5E3D8] text-[#1E4D3B] px-2 py-0.5 rounded-full font-bold">
                Level Taksonomi Bloom C4-C5
              </span>
            </div>
            <p className="text-xs text-[#4B5563] mt-1 leading-relaxed">
              AI Copilot mengevaluasi submisi mahasiswa merujuk pada kriteria berbobot di bawah ini secara objektif, konsisten, dan transparan.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            alert("Kepatuhan Terverifikasi: Seluruh rubrik sesuai dengan standar akreditasi OBE SV UNS.")
          }
          className="px-4 py-2 rounded-full bg-white border border-[#E5E3D8] text-[#1E4D3B] text-xs font-bold hover:bg-[#E2EFE9] transition-all shadow-2xs cursor-pointer shrink-0"
        >
          Cek Standar Capstone
        </button>
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
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-3xl border border-dashed border-[#E5E7EB] bg-white shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-[#E2EFE9] flex items-center justify-center text-[#1E4D3B] mb-3">
                <Layers size={28} />
              </div>
              <h3 className="text-base font-extrabold font-display text-[#111827]">
                Belum Ada Rubrik Penilaian
              </h3>
              <p className="text-xs text-[#6B7280] max-w-sm mt-1 mb-5">
                Rubrik membantu AI menghasilkan evaluasi yang adil, terukur, dan dapat dipertanggungjawabkan oleh dosen.
              </p>
              <button
                onClick={() => setIsCreating(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1E4D3B] text-white text-xs font-extrabold hover:bg-[#15392C] shadow-xs cursor-pointer"
              >
                <Plus size={15} />
                <span>Buat Rubrik Pertama</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {initialRubrics.map((r) => (
                <div
                  key={r.id}
                  className="p-6 sm:p-7 rounded-3xl border border-[#E5E7EB] bg-white hover:border-[#C5DDD1] transition-all space-y-6 shadow-xs"
                >
                  {/* Top Bar of Rubric */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F3F4F6]">
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="text-lg font-bold font-display text-[#111827]">
                          {r.title}
                        </h3>
                        <span className="font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#E2EFE9] text-[#1E4D3B]">
                          {r.criteria.length} Kriteria
                        </span>
                        {r._count.assignments > 0 ? (
                          <span className="font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            Dipakai di {r._count.assignments} tugas aktif
                          </span>
                        ) : (
                          <span className="font-mono text-[10px] px-2.5 py-0.5 rounded-full bg-[#F3F4F6] text-[#6B7280] border border-[#E5E7EB]">
                            Siap digunakan
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#6B7280] mt-1">
                        Dibuat pada {formatDate(r.createdAt)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingRubric(r)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#E5E7EB] text-xs font-bold text-[#1E4D3B] bg-white hover:bg-[#E2EFE9] hover:border-[#C5DDD1] transition-all cursor-pointer shadow-2xs"
                      >
                        <Edit3 size={13} />
                        <span>Edit Kriteria</span>
                      </button>
                      <button
                        onClick={() => handleDelete(r.id, r._count.assignments)}
                        disabled={deletingId === r.id}
                        className="p-2 rounded-full text-[#9CA3AF] hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        title="Hapus Rubrik"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* ==========================================
                      VIEW MODE: CARDS (Google Classroom Rubric Style)
                      Clean, responsive, digestible, NO horizontal tables!
                      ========================================== */}
                  {viewMode === "CARDS" ? (
                    <div className="space-y-4">
                      {r.criteria.map((c, idx) => {
                        const isExpanded = expandedCriteria[c.id] ?? false;

                        return (
                          <div
                            key={c.id}
                            className="p-5 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB] hover:border-[#C5DDD1] transition space-y-3.5"
                          >
                            {/* Criterion Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                              <div className="flex items-start gap-3">
                                <span className="w-7 h-7 rounded-xl bg-[#1E4D3B] text-white font-mono text-xs font-extrabold flex items-center justify-center shrink-0 mt-0.5">
                                  {idx + 1}
                                </span>
                                <div>
                                  <h4 className="text-sm font-bold text-[#111827]">
                                    {c.label}
                                  </h4>
                                  {c.description && (
                                    <p className="text-xs text-[#4B5563] mt-0.5 leading-relaxed">
                                      {c.description}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                                <span className="font-mono text-xs font-bold px-3 py-1 rounded-full bg-[#E2EFE9] text-[#1E4D3B]">
                                  Bobot: {c.weight}%
                                </span>
                                <span className="font-mono text-xs font-bold px-3 py-1 rounded-full bg-white text-[#4B5563] border border-[#E5E7EB]">
                                  Maks {c.maxScore} Poin
                                </span>
                                <button
                                  type="button"
                                  onClick={() => toggleCriterionExpand(c.id)}
                                  className="p-1.5 rounded-full hover:bg-white text-[#6B7280] transition"
                                  title={isExpanded ? "Tutup Deskripsi Level" : "Buka Deskripsi Level"}
                                >
                                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button>
                              </div>
                            </div>

                            {/* Rating Level Chips / Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-1">
                              {/* Level 1: Sangat Baik (100%) */}
                              <div className="p-3 rounded-xl bg-white border border-emerald-200 shadow-2xs space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-mono text-[10px] font-bold text-emerald-800 uppercase">
                                    Sangat Baik
                                  </span>
                                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800">
                                    100%
                                  </span>
                                </div>
                                <p className="text-[11px] text-[#4B5563] leading-snug line-clamp-2">
                                  Standar capaian terpenuhi sempurna tanpa kekurangan fundamental.
                                </p>
                              </div>

                              {/* Level 2: Baik (80%) */}
                              <div className="p-3 rounded-xl bg-white border border-blue-200 shadow-2xs space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-mono text-[10px] font-bold text-blue-800 uppercase">
                                    Baik
                                  </span>
                                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800">
                                    80%
                                  </span>
                                </div>
                                <p className="text-[11px] text-[#4B5563] leading-snug line-clamp-2">
                                  Sebagian besar kriteria terpenuhi dengan catatan perbaikan minor.
                                </p>
                              </div>

                              {/* Level 3: Cukup (60%) */}
                              <div className="p-3 rounded-xl bg-white border border-[#E5E7EB] shadow-2xs space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-mono text-[10px] font-bold text-[#4B5563] uppercase">
                                    Cukup
                                  </span>
                                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#F3F4F6] text-[#4B5563]">
                                    60%
                                  </span>
                                </div>
                                <p className="text-[11px] text-[#6B7280] leading-snug line-clamp-2">
                                  Pemenuhan kriteria masih separuh jalan atau belum lengkap.
                                </p>
                              </div>

                              {/* Level 4: Perlu Bimbingan (40%) */}
                              <div className="p-3 rounded-xl bg-white border border-rose-200 shadow-2xs space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-mono text-[10px] font-bold text-rose-700 uppercase">
                                    Perlu Bimbingan
                                  </span>
                                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700">
                                    40%
                                  </span>
                                </div>
                                <p className="text-[11px] text-rose-700 leading-snug line-clamp-2">
                                  Belum memenuhi kompetensi dasar rubrik yang dipersyaratkan.
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* ==========================================
                        VIEW MODE: MATRIX RINGKAS
                        ========================================== */
                    <div className="overflow-x-auto border border-[#E5E7EB] rounded-2xl">
                      <table className="min-w-full text-left text-xs">
                        <thead className="bg-[#F9FAFB] text-[#111827] border-b border-[#E5E7EB]">
                          <tr>
                            <th className="py-3 px-4 font-bold w-48">Kriteria Penilaian</th>
                            <th className="py-3 px-3 font-bold text-center w-20">Bobot</th>
                            <th className="py-3 px-3 font-bold text-emerald-800 bg-emerald-50/50 min-w-[150px]">
                              Sangat Baik (100%)
                            </th>
                            <th className="py-3 px-3 font-bold text-blue-800 min-w-[140px]">
                              Baik (80%)
                            </th>
                            <th className="py-3 px-3 font-bold text-[#4B5563] min-w-[130px]">
                              Cukup (60%)
                            </th>
                            <th className="py-3 px-3 font-bold text-rose-700 bg-rose-50/50 min-w-[140px]">
                              Perlu Bimbingan (40%)
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E5E7EB]">
                          {r.criteria.map((c) => (
                            <tr key={c.id} className="hover:bg-[#F9FAFB] transition-colors">
                              <td className="p-3.5 align-top font-semibold text-[#111827]">
                                <div>{c.label}</div>
                                {c.description && (
                                  <div className="text-[11px] text-[#6B7280] font-normal mt-0.5">
                                    {c.description}
                                  </div>
                                )}
                              </td>
                              <td className="p-3.5 align-top text-center font-mono font-bold text-[#1E4D3B]">
                                <span className="bg-[#E2EFE9] px-2.5 py-1 rounded-full">
                                  {c.weight}%
                                </span>
                              </td>
                              <td className="p-3 align-top bg-emerald-50/30 text-[#111827] text-[11px] leading-relaxed">
                                Standar capaian terpenuhi 100% tanpa kekurangan fundamental.
                              </td>
                              <td className="p-3 align-top text-[#4B5563] text-[11px] leading-relaxed">
                                Sebagian besar kriteria terpenuhi dengan catatan perbaikan minor.
                              </td>
                              <td className="p-3 align-top text-[#6B7280] text-[11px] leading-relaxed">
                                Pemenuhan kriteria masih separuh jalan atau belum lengkap.
                              </td>
                              <td className="p-3 align-top bg-rose-50/30 text-rose-700 text-[11px] leading-relaxed">
                                Belum memenuhi kompetensi dasar rubrik yang dipersyaratkan.
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Human-in-the-Loop Validation Protocol banner */}
          <div className="p-6 rounded-3xl bg-[#E2EFE9] border border-[#C5DDD1] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-[#1E4D3B]" />
                <span className="text-xs font-extrabold text-[#1E4D3B]">
                  Human-in-the-Loop Validation Protocol
                </span>
                <span className="font-mono text-[9px] bg-white text-[#1E4D3B] px-2.5 py-0.5 rounded-full font-bold shadow-2xs">
                  Active Guardrail
                </span>
              </div>
              <span className="font-mono text-xs font-extrabold text-[#1E4D3B]">
                Confidence Threshold: ≥ {thresholdScore}.0%
              </span>
            </div>

            <p className="text-xs text-[#374151] leading-relaxed">
              Setiap penilaian AI dengan tingkat keyakinan di bawah ambang batas ini wajib melalui telaah manual dosen sebelum diterbitkan ke mahasiswa. Menjaga kepatuhan kurikulum dan objektivitas evaluasi akademik 100%.
            </p>

            <div className="flex items-center gap-3 pt-1">
              <span className="font-mono text-[10px] text-[#1E4D3B] font-bold">70%</span>
              <input
                type="range"
                min={70}
                max={95}
                value={thresholdScore}
                onChange={(e) => setThresholdScore(Number(e.target.value))}
                className="w-full accent-[#1E4D3B] cursor-pointer"
              />
              <span className="font-mono text-[10px] text-[#1E4D3B] font-bold">95%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
