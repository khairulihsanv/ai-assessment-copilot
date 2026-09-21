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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

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
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Back Link */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link href={`/classes/${classId}`} className="hover:text-foreground flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Kelas {className}</span>
        </Link>
      </div>

      <div className="border-b border-border/40 pb-4">
        <h1 className="text-2xl sm:text-3xl font-bold font-display text-foreground">
          Buat Tugas Baru
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Rancang instruksi penugasan dan kaitkan dengan rubrik AI untuk mempermudah koreksi.
        </p>
      </div>

      {error && (
        <div className="p-3.5 text-sm rounded-xl bg-destructive/10 border border-destructive/20 text-destructive font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="p-6 rounded-2xl border border-border bg-card space-y-5 shadow-sm">
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title" className="text-sm font-semibold">
            Judul Penugasan <span className="text-destructive">*</span>
          </Label>
          <Input
            id="title"
            placeholder="cth. Tugas 1 — Analisis Arsitektur Aplikasi Web & REST API"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            disabled={loading}
            className="text-base"
          />
        </div>

        {/* Instructions */}
        <div className="space-y-2">
          <Label htmlFor="instructions" className="text-sm font-semibold">
            Instruksi & Soal Tugas <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="instructions"
            placeholder="Tuliskan petunjuk pengerjaan, pertanyaan atau studi kasus, format jawaban yang diharapkan, serta referensi pendukung..."
            rows={7}
            value={formData.instructions}
            onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
            required
            disabled={loading}
            className="text-sm font-normal"
          />
          <p className="text-xs text-muted-foreground">
            Instruksi ini akan dibaca oleh AI Copilot untuk memahami konteks jawaban yang diharapkan dari mahasiswa.
          </p>
        </div>

        {/* Two-column layout for settings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
          {/* Submission Type */}
          <div className="space-y-2">
            <Label htmlFor="submissionType" className="text-sm font-semibold">
              Format Pengumpulan Jawaban
            </Label>
            <Select
              value={formData.submissionType}
              onValueChange={(val) => setFormData({ ...formData, submissionType: val ?? "ANY" })}
            >
              <SelectTrigger id="submissionType">
                <SelectValue placeholder="Pilih Format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ANY">Bebas (File Dokumen atau Teks Esai)</SelectItem>
                <SelectItem value="PDF">Dokumen PDF (.pdf)</SelectItem>
                <SelectItem value="DOCX">Microsoft Word (.docx)</SelectItem>
                <SelectItem value="TEXT">Teks Langsung / Esai Online</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="dueDate" className="text-sm font-semibold flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-primary" />
              Tenggat Waktu (Deadline) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="dueDate"
              type="datetime-local"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              required
              disabled={loading}
            />
          </div>

          {/* Max Score */}
          <div className="space-y-2">
            <Label htmlFor="maxScore" className="text-sm font-semibold">
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
              className="font-mono"
            />
          </div>

          {/* Rubric Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="rubricSelect" className="text-sm font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-accent" />
                Rubrik Penilaian AI
              </Label>
              <Link
                href={`/classes/${classId}/rubrics`}
                className="text-[11px] text-primary hover:underline"
              >
                + Kelola Rubrik
              </Link>
            </div>
            <Select
              value={formData.rubricId}
              onValueChange={(val) => setFormData({ ...formData, rubricId: val ?? "" })}
            >
              <SelectTrigger id="rubricSelect">
                <SelectValue placeholder="Pilih Rubrik Penilaian" />
              </SelectTrigger>
              <SelectContent>
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
        <div className="flex items-center gap-3 pt-3 border-t border-border/50">
          <input
            type="checkbox"
            id="allowLate"
            checked={formData.allowLateSubmission}
            onChange={(e) => setFormData({ ...formData, allowLateSubmission: e.target.checked })}
            className="w-4 h-4 rounded text-primary focus:ring-primary border-border"
          />
          <Label htmlFor="allowLate" className="text-xs text-muted-foreground cursor-pointer select-none">
            Izinkan pengumpulan terlambat setelah tenggat waktu (akan ditandai status Terlambat)
          </Label>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          Batal
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="gap-2 bg-primary text-primary-foreground font-semibold px-6 shadow-sm"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Terbitkan Tugas
        </Button>
      </div>
    </form>
  );
}
