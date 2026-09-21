"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, Sparkles, CheckCircle2, AlertCircle, Wand2, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface CriterionItem {
  id?: string;
  label: string;
  description: string;
  maxScore: number;
  weight: number;
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
      { label: "", description: "", maxScore: 100, weight: 0 },
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
    } else if (field === "label" || field === "description") {
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
    <form onSubmit={handleSubmit} className="space-y-6 bg-card border border-border p-6 rounded-2xl shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-4">
        <div>
          <h3 className="text-xl font-bold font-display text-foreground flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            {initialData?.id ? "Edit Rubrik Penilaian" : "Buat Rubrik Penilaian Baru"}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tentukan kriteria penilaian agar AI Copilot dapat memberikan evaluasi yang terstruktur dan konsisten.
          </p>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
            <Wand2 className="w-3.5 h-3.5 text-accent" /> Template:
          </span>
          {PRESETS.map((p, idx) => (
            <Button
              key={p.name}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset(idx)}
              className="text-xs h-7 px-2.5 bg-muted/40 hover:bg-accent/10 hover:text-accent border-border"
            >
              {p.name.split(" ")[1] || p.name}
            </Button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-3 text-sm rounded-xl bg-destructive/10 border border-destructive/20 text-destructive font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Rubric Title */}
      <div className="space-y-2">
        <Label htmlFor="rubricTitle" className="text-sm font-semibold">
          Judul Rubrik <span className="text-destructive">*</span>
        </Label>
        <Input
          id="rubricTitle"
          placeholder="cth. Rubrik Penilaian Ujian Akhir Semester / Tugas Analisis"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          disabled={loading}
          className="text-base font-medium"
        />
      </div>

      {/* Criteria List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Daftar Kriteria Penilaian</Label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Total Bobot:</span>
            <Badge
              variant={isWeightValid ? "default" : "destructive"}
              className={`font-mono text-xs ${
                isWeightValid
                  ? "bg-emerald-600 hover:bg-emerald-600 text-white"
                  : "bg-destructive text-destructive-foreground"
              }`}
            >
              {isWeightValid ? <CheckCircle2 className="w-3 h-3 mr-1 inline" /> : null}
              {totalWeight}% / 100%
            </Badge>
          </div>
        </div>

        {/* Progress Bar of Weight Allocation */}
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden flex">
          <div
            className={`h-full transition-all duration-300 ${
              isWeightValid
                ? "bg-emerald-500"
                : totalWeight > 100
                ? "bg-rose-500"
                : "bg-amber-500"
            }`}
            style={{ width: `${Math.min(totalWeight, 100)}%` }}
          />
        </div>

        <div className="space-y-3">
          {criteria.map((c, index) => (
            <div
              key={index}
              className="p-4 rounded-xl border border-border/80 bg-muted/20 hover:border-border transition-all space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-6 space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Label Kriteria #{index + 1} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      placeholder="cth. Pemahaman Konsep & Teori"
                      value={c.label}
                      onChange={(e) => updateCriterion(index, "label", e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="sm:col-span-3 space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Bobot (%) <span className="text-destructive">*</span>
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
                        className="pr-7 font-mono font-semibold"
                      />
                      <span className="absolute right-2.5 top-2.5 text-xs text-muted-foreground font-mono">%</span>
                    </div>
                  </div>

                  <div className="sm:col-span-3 space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Skor Maksimal <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      max="1000"
                      value={c.maxScore || ""}
                      onChange={(e) => updateCriterion(index, "maxScore", e.target.value)}
                      required
                      disabled={loading}
                      className="font-mono"
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeCriterion(index)}
                  disabled={criteria.length <= 1 || loading}
                  className="text-muted-foreground hover:text-destructive h-9 w-9 p-0 mt-6"
                  title="Hapus Kriteria"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Deskripsi / Panduan Penilaian (Opsional)
                </Label>
                <Input
                  placeholder="Panduan bagi AI dan dosen saat menilai aspek ini..."
                  value={c.description}
                  onChange={(e) => updateCriterion(index, "description", e.target.value)}
                  disabled={loading}
                  className="text-xs"
                />
              </div>
            </div>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={addCriterion}
          disabled={loading}
          className="w-full border-dashed border-primary/40 text-primary hover:bg-primary/5 gap-2"
        >
          <Plus className="w-4 h-4" />
          Tambah Kriteria Penilaian
        </Button>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/50">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Batal
          </Button>
        )}
        <Button
          type="submit"
          disabled={loading || !isWeightValid}
          className="gap-2 bg-primary text-primary-foreground font-semibold px-6 shadow-sm"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {initialData?.id ? "Simpan Perubahan" : "Simpan Rubrik Penilaian"}
        </Button>
      </div>
    </form>
  );
}
