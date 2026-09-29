"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  Loader2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Wand2,
  Layers,
  BookOpen,
  KeyRound,
  FileText,
  ChevronDown,
  ChevronUp,
  Brain,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CriterionItem {
  id?: string;
  label: string;
  description: string;
  maxScore: number;
  weight: number;
  answerKey?: string;
  material?: string;
}

interface RubricEditorProps {
  classId: string;
  initialData?: {
    id?: string;
    title: string;
    criteria: CriterionItem[];
  };
  onSuccess?: () => void;
  onCancel?: () => void;
}

const PRESETS = [
  {
    name: "Tugas Esai & Analisis",
    criteria: [
      { label: "Pemahaman Konsep & Teori", description: "Kedalaman penguasaan teori dan keakuratan penjelasan konsep.", maxScore: 100, weight: 40 },
      { label: "Analisis Kritis & Argumen", description: "Kemampuan menyusun penalaran, elaborasi, dan analisis orisinal.", maxScore: 100, weight: 35 },
      { label: "Struktur & Sistematika Bahasa", description: "Kejelasan alur pembahasan, tata bahasa akademik, dan referensi.", maxScore: 100, weight: 25 },
    ],
  },
  {
    name: "Tugas Pemrograman / Coding",
    criteria: [
      { label: "Fungsionalitas & Kebenaran Logika", description: "Program berjalan sesuai spesifikasi dan menangani edge cases.", maxScore: 100, weight: 50 },
      { label: "Kualitas Kode & Best Practices", description: "Kerapian struktur, penamaan variabel, modularitas, dan efisiensi.", maxScore: 100, weight: 30 },
      { label: "Dokumentasi & Penjelasan Solusi", description: "Komentar kode yang informatif dan ringkasan implementasi.", maxScore: 100, weight: 20 },
    ],
  },
  {
    name: "Laporan Praktikum / Proyek",
    criteria: [
      { label: "Metodologi & Prosedur", description: "Kelengkapan tahapan praktikum dan instrumen yang digunakan.", maxScore: 100, weight: 30 },
      { label: "Hasil Analisis & Pembahasan", description: "Interpretasi data pengamatan dan kaitan dengan teori dasar.", maxScore: 100, weight: 50 },
      { label: "Kesimpulan & Evaluasi", description: "Kesimpulan tepat sasaran menjawab tujuan praktikum.", maxScore: 100, weight: 20 },
    ],
  },
];

export function RubricEditor({ classId, initialData, onSuccess, onCancel }: RubricEditorProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialData?.title || "");
  const [criteria, setCriteria] = useState<CriterionItem[]>(
    initialData?.criteria && initialData.criteria.length > 0
      ? initialData.criteria
      : [
          { label: "Kesesuaian Jawaban", description: "Kesesuaian isi jawaban dengan instruksi penugasan", maxScore: 100, weight: 50, answerKey: "", material: "" },
          { label: "Kualitas Argumen & Bukti", description: "Kedalaman materi dan analisis yang disajikan", maxScore: 100, weight: 50, answerKey: "", material: "" },
        ]
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedPanels, setExpandedPanels] = useState<Record<number, boolean>>({});

  const totalWeight = criteria.reduce((sum, c) => sum + (Number(c.weight) || 0), 0);
  const isWeightValid = Math.abs(totalWeight - 100) < 0.01;

  const togglePanel = (index: number) => {
    setExpandedPanels((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const addCriterion = () => {
    setCriteria([
      ...criteria,
      { label: "", description: "", maxScore: 100, weight: 0, answerKey: "", material: "" },
    ]);
    // Auto-expand the new criterion
    setExpandedPanels((prev) => ({ ...prev, [criteria.length]: true }));
  };

  const removeCriterion = (index: number) => {
    if (criteria.length <= 1) {
      alert("Rubrik harus memiliki minimal 1 kriteria");
      return;
    }
    setCriteria(criteria.filter((_, i) => i !== index));
  };

  const updateCriterion = (index: number, field: keyof CriterionItem, value: string | number) => {
    const updated = [...criteria];
    const item = { ...updated[index] };
    if (!item) return;

    if (field === "weight" || field === "maxScore") {
      item[field] = Number(value) || 0;
    } else if (field === "label" || field === "description" || field === "answerKey" || field === "material") {
      item[field] = String(value);
    }

    updated[index] = item as CriterionItem;
    setCriteria(updated);
  };

  const applyPreset = (presetIndex: number) => {
    const p = PRESETS[presetIndex];
    if (!p) return;
    if (confirm(`Terapkan preset template "${p.name}"? Kriteria saat ini akan digantikan.`)) {
      setTitle(p.name);
      setCriteria([...p.criteria.map((c) => ({ ...c, answerKey: "", material: "" }))]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Judul rubrik tidak boleh kosong");
      return;
    }

    if (!isWeightValid) {
      setError(`Total bobot kriteria saat ini ${totalWeight}%. Harus tepat 100%!`);
      return;
    }

    for (let i = 0; i < criteria.length; i++) {
      const c = criteria[i];
      if (!c?.label.trim()) {
        setError(`Nama kriteria #${i + 1} masih kosong.`);
        return;
      }
      if (c.maxScore <= 0) {
        setError(`Skor maksimal untuk kriteria #${i + 1} harus lebih dari 0.`);
        return;
      }
      if (c.weight <= 0) {
        setError(`Bobot kriteria #${i + 1} harus lebih dari 0%.`);
        return;
      }
    }

    // Check if at least one criterion has answerKey or material
    const hasAnyReference = criteria.some(
      (c) => (c.answerKey && c.answerKey.trim()) || (c.material && c.material.trim())
    );
    if (!hasAnyReference) {
      setError("Minimal satu kriteria harus memiliki Kunci Jawaban atau Materi Referensi agar AI dapat menilai secara akurat.");
      return;
    }

    setLoading(true);

    try {
      const url = initialData?.id
        ? `/api/classes/${classId}/rubrics/${initialData.id}`
        : `/api/classes/${classId}/rubrics`;

      const method = initialData?.id ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          criteria: criteria.map((c) => ({
            label: c.label.trim(),
            description: c.description?.trim() || undefined,
            answerKey: c.answerKey?.trim() || undefined,
            material: c.material?.trim() || undefined,
            maxScore: Number(c.maxScore),
            weight: Number(c.weight),
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menyimpan rubrik");
      }

      router.refresh();
      onSuccess?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 bg-white border border-[#E5E7EB] p-7 rounded-3xl shadow-sm animate-in fade-in-50 duration-300"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F3F4F6] pb-4">
        <div>
          <h3 className="text-xl font-extrabold font-display text-[#111827] flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#1E4D3B] text-white flex items-center justify-center shrink-0">
              <Layers size={18} />
            </div>
            <span>{initialData?.id ? "Edit Rubrik Penilaian" : "Buat Rubrik Penilaian Baru"}</span>
          </h3>
          <p className="text-xs text-[#6B7280] mt-1">
            Tentukan kriteria, masukkan <strong>Kunci Jawaban</strong> dan <strong>Materi Referensi</strong> agar AI Copilot menilai berdasarkan data faktual, bukan asumsi.
          </p>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-[#6B7280] flex items-center gap-1 mr-1">
            <Wand2 className="w-3.5 h-3.5 text-[#FFA07A]" /> Template:
          </span>
          {PRESETS.map((p, idx) => (
            <button
              key={p.name}
              type="button"
              onClick={() => applyPreset(idx)}
              className="text-xs font-bold px-3 py-1.5 rounded-full bg-[#F3F4F6] hover:bg-[#E2EFE9] text-[#374151] hover:text-[#1E4D3B] border border-[#E5E7EB] transition-all cursor-pointer"
            >
              {p.name.split(" ")[1] || p.name}
            </button>
          ))}
        </div>
      </div>

      {/* AI Vector Info Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-[#E2EFE9] to-[#F0F7F4] border border-[#C5DDD1] flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#1E4D3B] text-white flex items-center justify-center shrink-0 mt-0.5">
          <Brain size={16} />
        </div>
        <div>
          <p className="text-xs font-extrabold text-[#1E4D3B]">
            🧬 Sistem Penilaian Berbasis Vector Embedding
          </p>
          <p className="text-[11px] text-[#4B5563] mt-0.5 leading-relaxed">
            Kunci Jawaban dan Materi yang Anda input akan di-<em>embed</em> ke database vektor. Saat AI menilai jawaban mahasiswa,
            sistem menghitung <strong>kesamaan semantik (cosine similarity)</strong> untuk mengklasifikasikan kualitas jawaban secara objektif — bukan mengarang sendiri.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3.5 text-xs rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Rubric Title */}
      <div className="space-y-1.5">
        <Label htmlFor="rubricTitle" className="text-xs font-extrabold text-[#374151]">
          Judul Rubrik <span className="text-rose-600">*</span>
        </Label>
        <Input
          id="rubricTitle"
          placeholder="cth. Rubrik Penilaian Ujian Akhir Semester / Tugas Analisis"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          disabled={loading}
          className="rounded-2xl bg-[#F9FAFB] border-[#E5E7EB] focus:border-[#1E4D3B] focus:bg-white text-xs py-2.5 h-10 font-medium"
        />
      </div>

      {/* Criteria List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-extrabold text-[#374151]">Daftar Kriteria Penilaian</Label>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[#6B7280]">Total Bobot:</span>
            <span
              className={`font-mono text-xs px-3 py-0.5 rounded-full font-bold ${
                isWeightValid
                  ? "bg-[#E2EFE9] text-[#1E4D3B] border border-[#C5DDD1]"
                  : "bg-rose-100 text-rose-700 border border-rose-200"
              }`}
            >
              {isWeightValid ? <CheckCircle2 className="w-3 h-3 mr-1 inline" /> : null}
              {totalWeight}% / 100%
            </span>
          </div>
        </div>

        {/* Progress Bar of Weight Allocation */}
        <div className="w-full h-2.5 bg-[#F3F4F6] rounded-full overflow-hidden flex">
          <div
            className={`h-full transition-all duration-300 ${
              isWeightValid
                ? "bg-[#1E4D3B]"
                : totalWeight > 100
                ? "bg-rose-500"
                : "bg-amber-500"
            }`}
            style={{ width: `${Math.min(totalWeight, 100)}%` }}
          />
        </div>

        <div className="space-y-4">
          {criteria.map((c, index) => {
            const isExpanded = expandedPanels[index] ?? false;
            const hasAnswerKey = !!(c.answerKey && c.answerKey.trim());
            const hasMaterial = !!(c.material && c.material.trim());

            return (
              <div
                key={index}
                className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] hover:border-[#C5DDD1] transition-all overflow-hidden"
              >
                {/* Criterion Header Bar */}
                <div className="p-5 space-y-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-3">
                      <div className="sm:col-span-6 space-y-1">
                        <Label className="text-xs font-bold text-[#4B5563]">
                          Label Kriteria #{index + 1} <span className="text-rose-600">*</span>
                        </Label>
                        <Input
                          placeholder="cth. Pemahaman Konsep & Teori"
                          value={c.label}
                          onChange={(e) => updateCriterion(index, "label", e.target.value)}
                          required
                          disabled={loading}
                          className="rounded-xl bg-white border-[#E5E7EB] focus:border-[#1E4D3B] text-xs h-9"
                        />
                      </div>

                      <div className="sm:col-span-3 space-y-1">
                        <Label className="text-xs font-bold text-[#4B5563]">
                          Bobot (%) <span className="text-rose-600">*</span>
                        </Label>
                        <div className="relative">
                          <Input
                            type="number"
                            min="1"
                            max="100"
                            value={c.weight || ""}
                            onChange={(e) => updateCriterion(index, "weight", e.target.value)}
                            required
                            disabled={loading}
                            className="rounded-xl bg-white border-[#E5E7EB] focus:border-[#1E4D3B] pr-7 font-mono font-bold text-xs h-9"
                          />
                          <span className="absolute right-2.5 top-2 text-xs text-[#9CA3AF] font-mono">%</span>
                        </div>
                      </div>

                      <div className="sm:col-span-3 space-y-1">
                        <Label className="text-xs font-bold text-[#4B5563]">
                          Skor Maksimal <span className="text-rose-600">*</span>
                        </Label>
                        <Input
                          type="number"
                          min="1"
                          max="1000"
                          value={c.maxScore || ""}
                          onChange={(e) => updateCriterion(index, "maxScore", e.target.value)}
                          required
                          disabled={loading}
                          className="rounded-xl bg-white border-[#E5E7EB] focus:border-[#1E4D3B] font-mono font-bold text-xs h-9"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeCriterion(index)}
                      disabled={criteria.length <= 1 || loading}
                      className="text-[#9CA3AF] hover:text-rose-600 hover:bg-rose-50 h-9 w-9 rounded-xl flex items-center justify-center transition mt-5 shrink-0 cursor-pointer disabled:opacity-40"
                      title="Hapus Kriteria"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-[#6B7280]">
                      Deskripsi / Panduan Penilaian (Opsional)
                    </Label>
                    <Input
                      placeholder="Panduan bagi AI dan dosen saat menilai aspek ini..."
                      value={c.description}
                      onChange={(e) => updateCriterion(index, "description", e.target.value)}
                      disabled={loading}
                      className="rounded-xl bg-white border-[#E5E7EB] focus:border-[#1E4D3B] text-xs h-9"
                    />
                  </div>

                  {/* Toggle for Answer Key & Material panels */}
                  <button
                    type="button"
                    onClick={() => togglePanel(index)}
                    className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-white border border-[#E5E7EB] hover:bg-[#F0F7F4] hover:border-[#C5DDD1] transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Brain size={14} className="text-[#1E4D3B]" />
                      <span className="text-xs font-bold text-[#374151]">
                        Kunci Jawaban & Materi Referensi
                      </span>
                      {/* Status badges */}
                      {hasAnswerKey && (
                        <span className="font-mono text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                          <KeyRound size={9} /> Kunci ✓
                        </span>
                      )}
                      {hasMaterial && (
                        <span className="font-mono text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 flex items-center gap-1">
                          <BookOpen size={9} /> Materi ✓
                        </span>
                      )}
                      {!hasAnswerKey && !hasMaterial && (
                        <span className="font-mono text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                          Belum Diisi
                        </span>
                      )}
                    </div>
                    {isExpanded ? (
                      <ChevronUp size={14} className="text-[#6B7280] group-hover:text-[#1E4D3B] transition" />
                    ) : (
                      <ChevronDown size={14} className="text-[#6B7280] group-hover:text-[#1E4D3B] transition" />
                    )}
                  </button>
                </div>

                {/* Expandable Answer Key & Material Panels */}
                {isExpanded && (
                  <div className="px-5 pb-5 space-y-4 border-t border-[#E5E7EB] pt-4 bg-gradient-to-b from-[#F0F7F4]/50 to-[#F9FAFB]">
                    {/* Answer Key Input */}
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-[#1E4D3B] flex items-center gap-1.5">
                        <KeyRound size={13} className="text-emerald-600" />
                        Kunci Jawaban
                        <span className="font-mono text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">
                          🧬 Akan di-embed
                        </span>
                      </Label>
                      <p className="text-[10px] text-[#6B7280] leading-relaxed -mt-0.5">
                        Tulis kunci jawaban lengkap untuk kriteria ini. AI akan menghitung kesamaan semantik antara jawaban mahasiswa dengan kunci jawaban ini.
                      </p>
                      <textarea
                        placeholder="Tuliskan kunci jawaban lengkap di sini. Semakin detail dan akurat kunci jawaban, semakin presisi AI dalam menilai...&#10;&#10;Contoh: NLP (Natural Language Processing) adalah cabang AI yang berfokus pada interaksi antara komputer dan bahasa manusia. Komponen utamanya meliputi tokenisasi, POS tagging, Named Entity Recognition, dan sentiment analysis..."
                        value={c.answerKey || ""}
                        onChange={(e) => updateCriterion(index, "answerKey", e.target.value)}
                        disabled={loading}
                        rows={5}
                        className="w-full rounded-xl bg-white border border-[#E5E7EB] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 text-xs p-3 resize-y placeholder:text-[#9CA3AF] transition-all outline-none"
                      />
                      {c.answerKey && (
                        <p className="text-[10px] text-[#9CA3AF] font-mono">
                          {c.answerKey.length.toLocaleString()} karakter
                        </p>
                      )}
                    </div>

                    {/* Material Input */}
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-[#1E4D3B] flex items-center gap-1.5">
                        <BookOpen size={13} className="text-blue-600" />
                        Materi Referensi
                        <span className="font-mono text-[9px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">
                          🧬 Akan di-embed
                        </span>
                      </Label>
                      <p className="text-[10px] text-[#6B7280] leading-relaxed -mt-0.5">
                        Paste materi ajar, catatan kuliah, atau referensi yang relevan. AI akan menggunakan ini sebagai dasar pengetahuan faktual saat mengevaluasi.
                      </p>
                      <textarea
                        placeholder="Paste materi kuliah, ringkasan, atau referensi ilmiah yang menjadi dasar penilaian...&#10;&#10;Contoh: Bab 5 - Pengantar NLP. Natural Language Processing merupakan bidang interdisipliner yang menggabungkan linguistik komputasional, machine learning, dan deep learning..."
                        value={c.material || ""}
                        onChange={(e) => updateCriterion(index, "material", e.target.value)}
                        disabled={loading}
                        rows={5}
                        className="w-full rounded-xl bg-white border border-[#E5E7EB] focus:border-blue-500 focus:ring-1 focus:ring-blue-200 text-xs p-3 resize-y placeholder:text-[#9CA3AF] transition-all outline-none"
                      />
                      {c.material && (
                        <p className="text-[10px] text-[#9CA3AF] font-mono">
                          {c.material.length.toLocaleString()} karakter
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={addCriterion}
          disabled={loading}
          className="w-full py-3 rounded-2xl border-2 border-dashed border-[#C5DDD1] text-[#1E4D3B] hover:bg-[#E2EFE9]/40 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Kriteria Penilaian</span>
        </button>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-between gap-3 pt-4 border-t border-[#F3F4F6]">
        <p className="text-[10px] text-[#9CA3AF] flex items-center gap-1.5">
          <Sparkles size={11} className="text-[#FFA07A]" />
          Embedding vektor akan di-generate otomatis saat rubrik disimpan
        </p>
        <div className="flex items-center gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-5 py-2.5 rounded-full border border-[#E5E7EB] text-[#374151] hover:bg-[#F3F4F6] text-xs font-bold transition cursor-pointer"
            >
              Batal
            </button>
          )}
          <button
            type="submit"
            disabled={loading || !isWeightValid}
            className="flex items-center gap-2 bg-[#1E4D3B] hover:bg-[#15392C] text-white font-extrabold text-xs px-6 py-2.5 rounded-full shadow-xs hover:shadow transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{loading ? "Menyimpan & Embedding..." : initialData?.id ? "Simpan Perubahan" : "Simpan Rubrik Penilaian"}</span>
          </button>
        </div>
      </div>
    </form>
  );
}
