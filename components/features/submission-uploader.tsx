"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  UploadCloud,
  FileText,
  File,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useUploadProgress } from "@/hooks/useUploadProgress";
import { fileSizeToString, MAX_FILE_SIZE } from "@/lib/utils";

interface SubmissionUploaderProps {
  classId: string;
  assignmentId: string;
  allowedType: "TEXT" | "PDF" | "DOCX" | "ANY";
  existingSubmission?: {
    type: "TEXT" | "PDF" | "DOCX" | "ANY" | string;
    content?: string | null;
    fileName?: string | null;
    submittedAt: Date | string;
  } | null;
  onSuccess?: () => void;
}

export function SubmissionUploader({
  classId,
  assignmentId,
  allowedType,
  existingSubmission,
  onSuccess,
}: SubmissionUploaderProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { progress, uploading, error: uploadError, startUpload } = useUploadProgress();

  const [activeTab, setActiveTab] = useState<"file" | "text">(
    allowedType === "TEXT" ? "text" : "file"
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [textContent, setTextContent] = useState(existingSubmission?.content || "");
  const [dragOver, setDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const wordCount = textContent.trim() ? textContent.trim().split(/\s+/).length : 0;
  const charCount = textContent.length;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    validateAndSetFile(file);
  };

  const validateAndSetFile = (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage(`Ukuran file terlalu besar (${fileSizeToString(file.size)}). Maksimal 10MB.`);
      return;
    }

    const name = file.name.toLowerCase();
    const isPdf = name.endsWith(".pdf");
    const isDocx = name.endsWith(".docx");

    if (allowedType === "PDF" && !isPdf) {
      setErrorMessage("Hanya file PDF (.pdf) yang diperbolehkan untuk tugas ini.");
      return;
    }

    if (allowedType === "DOCX" && !isDocx) {
      setErrorMessage("Hanya file Microsoft Word (.docx) yang diperbolehkan untuk tugas ini.");
      return;
    }

    if (!isPdf && !isDocx) {
      setErrorMessage("Format file tidak didukung. Harap unggah dokumen PDF (.pdf) atau Word (.docx).");
      return;
    }

    setSelectedFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    setErrorMessage(null);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccess(false);

    const url = `/api/classes/${classId}/assignments/${assignmentId}/submissions`;

    try {
      if (activeTab === "file") {
        if (!selectedFile) {
          setErrorMessage("Silakan pilih file jawaban terlebih dahulu.");
          return;
        }

        const formData = new FormData();
        formData.append("file", selectedFile);

        await startUpload({ url, body: formData, isFormData: true });
      } else {
        if (!textContent.trim()) {
          setErrorMessage("Teks jawaban tidak boleh kosong.");
          return;
        }

        await startUpload({
          url,
          body: { content: textContent.trim() },
          isFormData: false,
        });
      }

      setSuccess(true);
      router.refresh();
      onSuccess?.();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Gagal mengumpulkan tugas");
    }
  };

  return (
    <div className="space-y-5 bg-card border border-border p-6 rounded-2xl shadow-sm">
      <div className="flex items-center justify-between border-b border-border/50 pb-4">
        <div>
          <h3 className="text-lg font-bold font-display text-foreground">
            {existingSubmission ? "Perbarui Pengumpulan Tugas" : "Kumpulkan Jawaban Tugas"}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pastikan seluruh jawaban Anda telah memenuhi instruksi dan rubrik penilaian dosen.
          </p>
        </div>

        {/* Format Selector Tabs if ANY */}
        {allowedType === "ANY" && (
          <div className="flex items-center p-1 bg-muted rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("file")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === "file"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Upload Dokumen
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("text")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === "text"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Tulis Esai / Teks
            </button>
          </div>
        )}
      </div>

      {(errorMessage || uploadError) && (
        <div className="p-3.5 text-sm rounded-xl bg-destructive/10 border border-destructive/20 text-destructive font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage || uploadError}</span>
        </div>
      )}

      {success && (
        <div className="p-3.5 text-sm rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>Jawaban berhasil dikumpulkan! Dosen dapat memeriksa langsung atau dibantu oleh AI.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Upload Mode: File */}
        {activeTab === "file" && (
          <div className="space-y-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept={
                allowedType === "PDF"
                  ? ".pdf"
                  : allowedType === "DOCX"
                  ? ".docx"
                  : ".pdf,.docx"
              }
              className="hidden"
            />

            {!selectedFile ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
                  dragOver
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40 hover:bg-muted/30"
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-3">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-foreground">
                  Tarik dan lepas file jawaban di sini, atau <span className="text-primary hover:underline">pilih file</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Format didukung: {allowedType === "ANY" ? "PDF (.pdf) atau Word (.docx)" : allowedType} • Maksimal 10MB
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <File className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground font-mono line-clamp-1">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {fileSizeToString(selectedFile.size)}
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedFile(null)}
                  disabled={uploading}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Upload Mode: Text */}
        {activeTab === "text" && (
          <div className="space-y-2">
            <Label htmlFor="answerText" className="text-sm font-semibold">
              Tulis Jawaban Anda
            </Label>
            <Textarea
              id="answerText"
              placeholder="Ketikkan jawaban lengkap, uraian analisis, kode program, atau ringkasan tugas Anda di sini..."
              rows={10}
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              disabled={uploading}
              className="text-sm leading-relaxed"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{wordCount} kata • {charCount} karakter</span>
              <span>Pastikan jawaban relevan dengan rubrik penilaian</span>
            </div>
          </div>
        )}

        {/* Upload Progress Bar */}
        {uploading && (
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-foreground flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                Mengunggah jawaban ke server...
              </span>
              <span className="font-mono text-primary">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-border/40">
          <Button
            type="submit"
            disabled={
              uploading ||
              (activeTab === "file" && !selectedFile) ||
              (activeTab === "text" && !textContent.trim())
            }
            className="gap-2 bg-primary text-primary-foreground font-semibold px-6 shadow-sm"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Mengunggah ({progress}%)
              </>
            ) : (
              <>
                <UploadCloud className="w-4 h-4" />
                {existingSubmission ? "Kirim Ulang Jawaban" : "Kumpulkan Tugas"}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
