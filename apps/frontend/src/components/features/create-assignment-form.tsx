"use client";

import { AlertCircle, ChevronLeft, Clock, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface RubricItem {
  id: string;
  title: string;
  criteria: Array<{
    id: string;
    label: string;
    weight: number;
    maxScore: number;
  }>;
}

interface CreateAssignmentFormProps {
  classId: string;
  className: string;
  rubrics: RubricItem[];
}

export function CreateAssignmentForm({ classId, className, rubrics }: CreateAssignmentFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set default due date to 7 days in future at 23:59
  const defaultDueDate = new Date();
  defaultDueDate.setDate(defaultDueDate.getDate() + 7);
  defaultDueDate.setHours(23, 59, 0, 0);
  const formattedDefaultDue = defaultDueDate.toISOString().slice(0, 16);

  const [formData, setFormData] = useState({
    title: "",
    instructions: "",
    submissionType: "ANY",
    dueDate: formattedDefaultDue,
    maxScore: 100,
    allowLateSubmission: false,
    rubricId: "",
    status: "PUBLISHED",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.title.trim()) {
      setError("Judul tugas wajib diisi");
      return;
    }

    if (!formData.instructions.trim() || formData.instructions.trim().length < 10) {
      setError("Instruksi tugas minimal 10 karakter");
      return;
    }

    if (new Date(formData.dueDate) <= new Date()) {
      setError("Tenggat waktu harus berada di masa mendatang");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/classes/${classId}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          maxScore: Number(formData.maxScore),
          rubricId: formData.rubricId || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal membuat tugas");
      }

      router.push(`/classes/${classId}/assignments/${data.id}`);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-12 animate-in fade-in-50 duration-300">
      {/* Back Link */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link
          href={`/classes/${classId}`}
          className="hover:text-primary flex items-center gap-1.5 transition-colors font-medium"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Kembali ke Kelas {className}</span>
        </Link>
      </div>

      <div className="border-b border-border pb-4">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground">
            Assignment Designer
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold font-display text-foreground">
          Buat Tugas Baru
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Rancang instruksi penugasan dan kaitkan dengan rubrik AI untuk mempermudah evaluasi
          otomatis.
        </p>
      </div>

      {error && (
        <div className="p-3.5 text-xs rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="p-7 rounded-xl border border-border bg-card space-y-6 shadow-none">
        {/* Title */}
        <div className="space-y-1.5">
          <Label htmlFor="title" className="text-xs font-semibold text-foreground">
            Judul Penugasan <span className="text-rose-600">*</span>
          </Label>
          <Input
            id="title"
            placeholder="cth. Tugas 1 — Analisis Arsitektur Aplikasi Web & REST API"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            disabled={loading}
            className="rounded-lg bg-muted/50 border-border focus:border-primary focus:bg-card text-xs h-10 font-medium"
          />
        </div>

        {/* Instructions */}
        <div className="space-y-1.5">
          <Label htmlFor="instructions" className="text-xs font-semibold text-foreground">
            Instruksi & Soal Tugas <span className="text-rose-600">*</span>
          </Label>
          <Textarea
            id="instructions"
            placeholder="Tuliskan petunjuk pengerjaan, pertanyaan atau studi kasus, format jawaban yang diharapkan, serta referensi pendukung..."
            rows={7}
            value={formData.instructions}
            onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
            required
            disabled={loading}
            className="rounded-lg bg-muted/50 border-border focus:border-primary focus:bg-card text-xs leading-relaxed"
          />
          <p className="text-[11px] text-muted-foreground">
            Instruksi ini akan dibaca oleh AI Copilot untuk memahami konteks jawaban yang diharapkan
            dari mahasiswa.
          </p>
        </div>

        {/* Two-column layout for settings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
          {/* Submission Type */}
          <div className="space-y-1.5">
            <Label htmlFor="submissionType" className="text-xs font-semibold text-foreground">
              Format Pengumpulan Jawaban
            </Label>
            <Select
              value={formData.submissionType}
              onValueChange={(val) => setFormData({ ...formData, submissionType: val ?? "ANY" })}
            >
              <SelectTrigger
                id="submissionType"
                className="rounded-lg bg-muted/50 border-border text-xs h-10"
              >
                <SelectValue placeholder="Pilih Format" />
              </SelectTrigger>
              <SelectContent className="rounded-lg border-border">
                <SelectItem value="ANY">Bebas (File Dokumen atau Teks Esai)</SelectItem>
                <SelectItem value="PDF">Dokumen PDF (.pdf)</SelectItem>
                <SelectItem value="DOCX">Microsoft Word (.docx)</SelectItem>
                <SelectItem value="TEXT">Teks Langsung / Esai Online</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Due Date */}
          <div className="space-y-1.5">
            <Label
              htmlFor="dueDate"
              className="text-xs font-semibold text-foreground flex items-center gap-1.5"
            >
              <Clock className="w-3.5 h-3.5 text-primary" />
              Tenggat Waktu (Deadline) <span className="text-rose-600">*</span>
            </Label>
            <Input
              id="dueDate"
              type="datetime-local"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              required
              disabled={loading}
              className="rounded-lg bg-muted/50 border-border focus:border-primary focus:bg-card text-xs h-10 font-mono"
            />
          </div>

          {/* Max Score */}
          <div className="space-y-1.5">
            <Label htmlFor="maxScore" className="text-xs font-semibold text-foreground">
              Skor Maksimal
            </Label>
            <Input
              id="maxScore"
              type="number"
              min="1"
              max="1000"
              value={formData.maxScore}
              onChange={(e) =>
                setFormData({ ...formData, maxScore: Number(e.target.value) || 100 })
              }
              required
              disabled={loading}
              className="rounded-lg bg-muted/50 border-border focus:border-primary focus:bg-card text-xs h-10 font-mono font-bold"
            />
          </div>

          {/* Rubric Selection */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="rubricSelect"
                className="text-xs font-semibold text-foreground flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                Rubrik Penilaian AI
              </Label>
              <Link
                href={`/classes/${classId}/rubrics`}
                className="text-[11px] text-primary font-bold hover:underline"
              >
                + Kelola Rubrik
              </Link>
            </div>
            <Select
              value={formData.rubricId || "none"}
              onValueChange={(val) =>
                setFormData({ ...formData, rubricId: val === "none" ? "" : (val ?? "") })
              }
            >
              <SelectTrigger
                id="rubricSelect"
                className="rounded-lg bg-muted/50 border-border text-xs h-10"
              >
                <SelectValue placeholder="Pilih Rubrik Penilaian" />
              </SelectTrigger>
              <SelectContent className="rounded-lg border-border">
                <SelectItem value="none">Tanpa Rubrik (Evaluasi AI memerlukan rubrik)</SelectItem>
                {rubrics.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.title} ({r.criteria.length} kriteria)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
              Pilih rubrik penilaian untuk tugas ini. Tugas dapat disimpan tanpa rubrik, namun
              evaluasi AI memerlukan rubrik dengan kriteria penilaian sebelum dapat dijalankan.
            </p>
          </div>
        </div>

        {/* Allow Late Submissions Toggle */}
        <div className="flex items-center gap-3 pt-3 border-t border-border">
          <input
            type="checkbox"
            id="allowLate"
            checked={formData.allowLateSubmission}
            onChange={(e) => setFormData({ ...formData, allowLateSubmission: e.target.checked })}
            className="w-4 h-4 rounded accent-primary cursor-pointer"
          />
          <Label
            htmlFor="allowLate"
            className="text-xs text-muted-foreground cursor-pointer select-none"
          >
            Izinkan pengumpulan terlambat setelah tenggat waktu (akan ditandai status Terlambat)
          </Label>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={loading}
          className="px-5 py-2.5 rounded-full border border-border text-foreground hover:bg-muted text-xs font-bold transition cursor-pointer"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs px-7 py-3 rounded-full shadow-none hover:shadow transition-all disabled:opacity-60 cursor-pointer active:scale-[0.99]"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          <span>Terbitkan Tugas</span>
        </button>
      </div>
    </form>
  );
}
