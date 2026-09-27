"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, Sparkles, CheckCircle2, AlertCircle, Wand2, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CriterionItem {
  id?: string;
  label: string;
  description: string;
  maxScore: number;
  weight: number;
  expectedAnswer?: string;
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
          { label: "Kesesuaian Jawaban", description: "Kesesuaian isi jawaban dengan instruksi penugasan", maxScore: 100, weight: 50 },
          { label: "Kualitas Argumen & Bukti", description: "Kedalaman materi dan analisis yang disajikan", maxScore: 100, weight: 50 },
        ]
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalWeight = criteria.reduce((sum, c) => sum + (Number(c.weight) || 0), 0);
  const isWeightValid = Math.abs(totalWeight - 100) < 0.01;

  const addCriterion = () => {
    setCriteria([
      ...criteria,
      { label: "", description: "", maxScore: 100, weight: 0, expectedAnswer: "" },
    ]);
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
    } else if (field === "label" || field === "description" || field === "expectedAnswer") {
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
      setCriteria([...p.criteria]);
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
            expectedAnswer: c.expectedAnswer?.trim() || undefined,
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
            Tentukan kriteria penilaian agar AI Copilot dapat memberikan evaluasi yang terstruktur dan konsisten.
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

        <div className="space-y-3.5">
          {criteria.map((c, index) => (
            <div
              key={index}
              className="p-5 rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] hover:border-[#C5DDD1] transition-all space-y-3.5"
            >
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
              <div className="space-y-1">
                <Label className="text-xs font-medium text-[#6B7280] flex items-center gap-1.5">
                  Kunci Jawaban Eksak (Opsional)
                  <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded uppercase tracking-wider">⚡ Fast-Pass</span>
                </Label>
                <Input
                  placeholder="Misal: deskripsi NLP (AI akan otomatis memberi nilai penuh jika jawaban mahasiswa mengandung kata ini)"
                  value={c.expectedAnswer || ""}
                  onChange={(e) => updateCriterion(index, "expectedAnswer", e.target.value)}
                  disabled={loading}
                  className="rounded-xl bg-white border-[#E5E7EB] focus:border-[#1E4D3B] text-xs h-9"
                />
              </div>
            </div>
          ))}
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
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#F3F4F6]">
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
          <span>{initialData?.id ? "Simpan Perubahan" : "Simpan Rubrik Penilaian"}</span>
        </button>
      </div>
    </form>
  );
}
