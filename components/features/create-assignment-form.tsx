"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  ChevronLeft,
  FileText,
  FileCode,
  Sparkles,
  Loader2,
  Clock,
  Layers,
  AlertCircle,
  Send,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

export function CreateAssignmentForm({
  classId,
  className,
  rubrics,
}: CreateAssignmentFormProps) {
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
    rubricId: rubrics[0]?.id || "",
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
      <div className="flex items-center gap-2 text-xs text-[#6B7280]">
        <Link
          href={`/classes/${classId}`}
          className="hover:text-[#1E4D3B] flex items-center gap-1.5 transition-colors font-medium"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Kembali ke Kelas {className}</span>
        </Link>
      </div>

      <div className="border-b border-[#E5E7EB] pb-4">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#E2EFE9] text-[#1E4D3B]">
            Assignment Designer
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-[#111827]">
          Buat Tugas Baru
        </h1>
        <p className="text-xs text-[#6B7280] mt-1">
          Rancang instruksi penugasan dan kaitkan dengan rubrik AI untuk mempermudah evaluasi otomatis.
        </p>
      </div>

      {error && (
        <div className="p-3.5 text-xs rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="p-7 rounded-3xl border border-[#E5E7EB] bg-white space-y-6 shadow-xs">
        {/* Title */}
        <div className="space-y-1.5">
          <Label htmlFor="title" className="text-xs font-extrabold text-[#374151]">
            Judul Penugasan <span className="text-rose-600">*</span>
          </Label>
          <Input
            id="title"
            placeholder="cth. Tugas 1 — Analisis Arsitektur Aplikasi Web & REST API"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            disabled={loading}
            className="rounded-2xl bg-[#F9FAFB] border-[#E5E7EB] focus:border-[#1E4D3B] focus:bg-white text-xs h-10 font-medium"
          />
        </div>

        {/* Instructions */}
        <div className="space-y-1.5">
          <Label htmlFor="instructions" className="text-xs font-extrabold text-[#374151]">
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
            className="rounded-2xl bg-[#F9FAFB] border-[#E5E7EB] focus:border-[#1E4D3B] focus:bg-white text-xs leading-relaxed"
          />
          <p className="text-[11px] text-[#6B7280]">
            Instruksi ini akan dibaca oleh AI Copilot untuk memahami konteks jawaban yang diharapkan dari mahasiswa.
          </p>
        </div>

        {/* Two-column layout for settings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
          {/* Submission Type */}
          <div className="space-y-1.5">
            <Label htmlFor="submissionType" className="text-xs font-extrabold text-[#374151]">
              Format Pengumpulan Jawaban
            </Label>
            <Select
              value={formData.submissionType}
              onValueChange={(val) => setFormData({ ...formData, submissionType: val ?? "ANY" })}
            >
              <SelectTrigger id="submissionType" className="rounded-2xl bg-[#F9FAFB] border-[#E5E7EB] text-xs h-10">
                <SelectValue placeholder="Pilih Format" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-[#E5E7EB]">
                <SelectItem value="ANY">Bebas (File Dokumen atau Teks Esai)</SelectItem>
                <SelectItem value="PDF">Dokumen PDF (.pdf)</SelectItem>
                <SelectItem value="DOCX">Microsoft Word (.docx)</SelectItem>
                <SelectItem value="TEXT">Teks Langsung / Esai Online</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Due Date */}
          <div className="space-y-1.5">
            <Label htmlFor="dueDate" className="text-xs font-extrabold text-[#374151] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#1E4D3B]" />
              Tenggat Waktu (Deadline) <span className="text-rose-600">*</span>
            </Label>
            <Input
              id="dueDate"
              type="datetime-local"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              required
              disabled={loading}
              className="rounded-2xl bg-[#F9FAFB] border-[#E5E7EB] focus:border-[#1E4D3B] focus:bg-white text-xs h-10 font-mono"
            />
          </div>

          {/* Max Score */}
          <div className="space-y-1.5">
            <Label htmlFor="maxScore" className="text-xs font-extrabold text-[#374151]">
              Skor Maksimal
            </Label>
            <Input
              id="maxScore"
              type="number"
              min="1"
              max="1000"
              value={formData.maxScore}
              onChange={(e) => setFormData({ ...formData, maxScore: Number(e.target.value) || 100 })}
              required
              disabled={loading}
              className="rounded-2xl bg-[#F9FAFB] border-[#E5E7EB] focus:border-[#1E4D3B] focus:bg-white text-xs h-10 font-mono font-bold"
            />
          </div>

          {/* Rubric Selection */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="rubricSelect" className="text-xs font-extrabold text-[#374151] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#FFA07A]" />
                Rubrik Penilaian AI
              </Label>
              <Link
                href={`/classes/${classId}/rubrics`}
                className="text-[11px] text-[#1E4D3B] font-bold hover:underline"
              >
                + Kelola Rubrik
              </Link>
            </div>
            <Select
              value={formData.rubricId}
              onValueChange={(val) => setFormData({ ...formData, rubricId: val ?? "" })}
            >
              <SelectTrigger id="rubricSelect" className="rounded-2xl bg-[#F9FAFB] border-[#E5E7EB] text-xs h-10">
                <SelectValue placeholder="Pilih Rubrik Penilaian" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-[#E5E7EB]">
                <SelectItem value="">Tanpa Rubrik Khusus (Penilaian Umum AI)</SelectItem>
                {rubrics.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.title} ({r.criteria.length} kriteria)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Allow Late Submissions Toggle */}
        <div className="flex items-center gap-3 pt-3 border-t border-[#F3F4F6]">
          <input
            type="checkbox"
            id="allowLate"
            checked={formData.allowLateSubmission}
            onChange={(e) => setFormData({ ...formData, allowLateSubmission: e.target.checked })}
            className="w-4 h-4 rounded accent-[#1E4D3B] cursor-pointer"
          />
          <Label htmlFor="allowLate" className="text-xs text-[#6B7280] cursor-pointer select-none">
            Izinkan pengumpulan terlambat setelah tenggat waktu (akan ditandai status Terlambat)
          </Label>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={loading}
          className="px-5 py-2.5 rounded-full border border-[#E5E7EB] text-[#374151] hover:bg-[#F3F4F6] text-xs font-bold transition cursor-pointer"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 bg-[#1E4D3B] hover:bg-[#15392C] text-white font-extrabold text-xs px-7 py-3 rounded-full shadow-xs hover:shadow transition-all disabled:opacity-60 cursor-pointer active:scale-[0.99]"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          <span>Terbitkan Tugas</span>
        </button>
      </div>
    </form>
  );
}
