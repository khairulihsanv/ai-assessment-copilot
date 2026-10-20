"use client";

import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Camera,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit3,
  FileImage,
  FileText,
  HelpCircle,
  Loader2,
  Maximize2,
  Plus,
  RefreshCw,
  RotateCw,
  Trash2,
  Upload,
  Video,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";

export interface ScannedPageItem {
  id: string;
  pageNumber: number;
  file: File;
  previewUrl: string;
  rotation: number; // 0, 90, 180, 270
  extractedText: string;
  confirmedText: string;
  status: "PENDING" | "SUCCESS" | "EMPTY" | "FAILED";
  confidence: number;
  error?: string | null;
}

interface ScanSubmissionPanelProps {
  classId: string;
  assignmentId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const MAX_PAGES = 15;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function ScanSubmissionPanel({
  classId,
  assignmentId,
  onSuccess,
  onCancel,
}: ScanSubmissionPanelProps) {
  // Step state: "CAPTURE" -> "PROCESSING" -> "VERIFY"
  const [step, setStep] = useState<"CAPTURE" | "PROCESSING" | "VERIFY">("CAPTURE");
  const [pages, setPages] = useState<ScannedPageItem[]>([]);
  const [selectedPageIndex, setSelectedPageIndex] = useState<number>(0);

  // Camera state
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [isSecureContext, setIsSecureContext] = useState<boolean>(true);
  const [retakeTargetIndex, setRetakeTargetIndex] = useState<number | null>(null);

  // Verification & submission state
  const [ocrLoading, setOcrLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [previewZoom, setPreviewZoom] = useState<number>(1);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check secure context on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsSecureContext(window.isSecureContext);
    }
  }, []);

  const stopCamera = React.useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const startCamera = async (targetFacing: "environment" | "user" = facingMode) => {
    setCameraError(null);
    setErrorMessage(null);

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        "Kamera tidak didukung oleh browser ini atau konteks tidak aman (gunakan HTTPS/localhost). Silakan gunakan opsi unggah foto.",
      );
      return;
    }

    try {
      stopCamera();
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: targetFacing },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraActive(true);
      setFacingMode(targetFacing);
    } catch (err: unknown) {
      loggerError("Camera start error", err);
      let msg = "Gagal mengakses kamera. Pastikan izin kamera telah diberikan pada browser.";
      if (err instanceof DOMException) {
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          msg =
            "Izin akses kamera ditolak. Harap izinkan akses kamera di pengaturan browser atau unggah foto dari perangkat.";
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          msg = "Kamera tidak ditemukan pada perangkat ini. Silakan unggah file foto dari galeri.";
        } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
          msg =
            "Kamera sedang digunakan oleh aplikasi lain. Tutup aplikasi tersebut dan coba lagi.";
        }
      }
      setCameraError(msg);
      setIsCameraActive(false);
    }
  };

  const toggleCameraFacing = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    startCamera(nextMode);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !streamRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const pageNum = retakeTargetIndex !== null ? retakeTargetIndex + 1 : pages.length + 1;
        const file = new File([blob], `scan_page_${pageNum}_${Date.now()}.jpg`, {
          type: "image/jpeg",
        });

        const previewUrl = URL.createObjectURL(blob);
        const newPage: ScannedPageItem = {
          id: `page_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          pageNumber: pageNum,
          file,
          previewUrl,
          rotation: 0,
          extractedText: "",
          confirmedText: "",
          status: "PENDING",
          confidence: 0,
        };

        if (retakeTargetIndex !== null) {
          // Replace existing page
          setPages((prev) => {
            const next = [...prev];
            const target = next[retakeTargetIndex];
            if (target) {
              // revoke old preview url
              URL.revokeObjectURL(target.previewUrl);
              next[retakeTargetIndex] = {
                ...newPage,
                pageNumber: retakeTargetIndex + 1,
              };
            }
            return next;
          });
          setRetakeTargetIndex(null);
        } else {
          setPages((prev) => [...prev, newPage]);
        }

        stopCamera();
      },
      "image/jpeg",
      0.9,
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newPages: ScannedPageItem[] = [];
    const validExtensions = [".jpg", ".jpeg", ".png", ".webp"];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file) continue;
      if (pages.length + newPages.length >= MAX_PAGES) {
        setErrorMessage(`Batas maksimum ${MAX_PAGES} halaman tercapai.`);
        break;
      }

      if (file.size > MAX_FILE_SIZE) {
        setErrorMessage(`File ${file.name} melebihi batas 10MB.`);
        continue;
      }

      const lowerName = file.name.toLowerCase();
      const isValid = validExtensions.some((ext) => lowerName.endsWith(ext));
      if (!isValid) {
        setErrorMessage(
          `Format file ${file.name} tidak didukung. Harap pilih gambar JPG atau PNG.`,
        );
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      const pageNum = pages.length + newPages.length + 1;
      newPages.push({
        id: `page_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}`,
        pageNumber: pageNum,
        file,
        previewUrl,
        rotation: 0,
        extractedText: "",
        confirmedText: "",
        status: "PENDING",
        confidence: 0,
      });
    }

    if (newPages.length > 0) {
      setPages((prev) => [...prev, ...newPages]);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Rotate a page 90 degrees clockwise
  const rotatePage = async (index: number) => {
    const page = pages[index];
    if (!page) return;

    const img = new Image();
    img.src = page.previewUrl;
    await new Promise((res) => {
      img.onload = res;
    });

    const canvas = document.createElement("canvas");
    canvas.width = img.height;
    canvas.height = img.width;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((90 * Math.PI) / 180);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        URL.revokeObjectURL(page.previewUrl);
        const newPreviewUrl = URL.createObjectURL(blob);
        const newFile = new File([blob], page.file.name, { type: "image/jpeg" });

        setPages((prev) => {
          const updated = [...prev];
          updated[index] = {
            ...page,
            file: newFile,
            previewUrl: newPreviewUrl,
            rotation: (page.rotation + 90) % 360,
          };
          return updated;
        });
      },
      "image/jpeg",
      0.9,
    );
  };

  const deletePage = (index: number) => {
    const page = pages[index];
    if (page) {
      URL.revokeObjectURL(page.previewUrl);
    }
    setPages((prev) => {
      const filtered = prev.filter((_, i) => i !== index);
      // Re-index page numbers
      return filtered.map((p, idx) => ({ ...p, pageNumber: idx + 1 }));
    });
    if (selectedPageIndex >= pages.length - 1 && selectedPageIndex > 0) {
      setSelectedPageIndex(selectedPageIndex - 1);
    }
  };

  const movePage = (fromIndex: number, direction: "up" | "down") => {
    const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= pages.length) return;

    setPages((prev) => {
      const next = [...prev];
      const tempFrom = next[fromIndex];
      const tempTo = next[toIndex];
      if (!tempFrom || !tempTo) return prev;
      next[fromIndex] = tempTo;
      next[toIndex] = tempFrom;
      return next.map((p, idx) => ({ ...p, pageNumber: idx + 1 }));
    });
    setSelectedPageIndex(toIndex);
  };

  const retakePage = (index: number) => {
    setRetakeTargetIndex(index);
    startCamera();
  };

  // Step 2: Trigger OCR Processing
  const runOCR = async () => {
    if (pages.length === 0) {
      setErrorMessage("Silakan ambil atau unggah minimal satu halaman foto jawaban.");
      return;
    }

    setOcrLoading(true);
    setErrorMessage(null);
    setStep("PROCESSING");

    const formData = new FormData();
    pages.forEach((p, idx) => {
      formData.append(`page_file_${idx + 1}`, p.file);
    });

    try {
      const res = await fetch(
        `/api/classes/${classId}/assignments/${assignmentId}/submissions/ocr-scan`,
        {
          method: "POST",
          body: formData,
        },
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal memproses OCR pada gambar jawaban.");
      }

      // Update pages with OCR results
      setPages((prev) =>
        prev.map((p, idx) => {
          const ocrPage = data.pages?.[idx];
          if (ocrPage) {
            return {
              ...p,
              extractedText: ocrPage.extractedText || "",
              confirmedText: ocrPage.extractedText || "",
              status: ocrPage.status || "SUCCESS",
              confidence: ocrPage.confidence || 0,
              error: ocrPage.error || null,
            };
          }
          return p;
        }),
      );

      setSelectedPageIndex(0);
      setStep("VERIFY");
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Terjadi kesalahan saat memproses OCR.");
      setStep("CAPTURE");
    } finally {
      setOcrLoading(false);
    }
  };

  // Step 3: Confirm and Finalize Submission
  const handleFinalSubmit = async () => {
    setErrorMessage(null);
    setSubmitting(true);

    // Validate that at least some confirmed text exists
    const hasText = pages.some((p) => p.confirmedText.trim().length > 0);
    if (!hasText) {
      setErrorMessage(
        "Teks jawaban hasil verifikasi kosong. Harap lengkapi jawaban Anda sebelum mengumpulkan.",
      );
      setSubmitting(false);
      return;
    }

    const formData = new FormData();
    formData.append("isScanSubmission", "true");
    formData.append("type", "SCAN");

    const pagesMeta = pages.map((p) => ({
      pageNumber: p.pageNumber,
      extractedText: p.extractedText,
      confirmedText: p.confirmedText,
      status: p.status,
      confidence: p.confidence,
      error: p.error,
    }));
    formData.append("pages_meta", JSON.stringify(pagesMeta));

    // Append image files
    pages.forEach((p) => {
      formData.append(`page_file_${p.pageNumber}`, p.file);
    });

    try {
      const res = await fetch(`/api/classes/${classId}/assignments/${assignmentId}/submissions`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.detail || "Gagal menyimpan pengumpulan tugas.");
      }

      setSuccessMessage(
        "Jawaban hasil scan dan teks verifikasi berhasil dikumpulkan! Dosen dapat memeriksa lembar asli dan teks hasil pembacaan.",
      );
      onSuccess?.();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Gagal mengumpulkan tugas.");
    } finally {
      setSubmitting(false);
    }
  };

  const activePage = pages[selectedPageIndex];

  return (
    <div className="space-y-6">
      {/* Step Indicator Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-4">
        <div>
          <h4 className="text-base font-bold text-foreground font-display flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            <span>Scan / Foto Jawaban Kertas</span>
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Foto lembar jawaban tulisan tangan atau cetak, urutkan halaman, periksa teks hasil OCR,
            dan konfirmasi sebelum pengumpulan.
          </p>
        </div>

        {/* Workflow breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-medium">
          <span
            className={`px-2.5 py-1 rounded-full ${
              step === "CAPTURE"
                ? "bg-primary text-primary-foreground font-bold"
                : "bg-muted text-muted-foreground"
            }`}
          >
            1. Ambil/Unggah Halaman
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          <span
            className={`px-2.5 py-1 rounded-full ${
              step === "PROCESSING"
                ? "bg-primary text-primary-foreground font-bold animate-pulse"
                : step === "VERIFY"
                  ? "bg-muted text-muted-foreground"
                  : "bg-muted/40 text-muted-foreground/60"
            }`}
          >
            2. Proses OCR
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          <span
            className={`px-2.5 py-1 rounded-full ${
              step === "VERIFY"
                ? "bg-primary text-primary-foreground font-bold"
                : "bg-muted/40 text-muted-foreground/60"
            }`}
          >
            3. Verifikasi & Kumpulkan
          </span>
        </div>
      </div>

      {/* Error & Warning Alert Banner */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {cameraError && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-sm font-medium flex items-center gap-2">
          <HelpCircle className="w-4 h-4 flex-shrink-0" />
          <span>{cameraError}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-sm font-medium flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* STEP 1: CAPTURE & MANAGE PAGES */}
      {/* ========================================================= */}
      {step === "CAPTURE" && (
        <div className="space-y-6">
          {/* Active Camera Viewfinder Modal / Section */}
          {isCameraActive ? (
            <div className="relative rounded-2xl overflow-hidden bg-black border border-border shadow-md">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full max-h-[460px] object-contain mx-auto"
              />

              {/* Viewfinder Overlay Guide */}
              <div className="absolute inset-4 pointer-events-none border-2 border-dashed border-white/50 rounded-xl flex items-center justify-center">
                <span className="text-white/70 text-xs px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-xs">
                  Posisikan lembar jawaban di dalam bingkai & pastikan teks terlihat tajam
                </span>
              </div>

              {/* Camera Controls Bar */}
              <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-4 px-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={toggleCameraFacing}
                  className="bg-black/60 text-white border-white/30 hover:bg-black/80"
                  title="Ganti Kamera Depan/Belakang"
                >
                  <RefreshCw className="w-4 h-4 mr-1.5" />
                  Ganti Kamera
                </Button>

                <Button
                  type="button"
                  size="lg"
                  onClick={capturePhoto}
                  className="bg-white text-black hover:bg-white/90 font-bold px-6 py-6 rounded-full shadow-lg text-base flex items-center gap-2"
                >
                  <Camera className="w-6 h-6" />
                  {retakeTargetIndex !== null ? "Foto Ulang Halaman" : "Ambil Foto"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={stopCamera}
                  className="bg-black/60 text-white border-white/30 hover:bg-black/80"
                >
                  <X className="w-4 h-4 mr-1.5" />
                  Batal
                </Button>
              </div>
            </div>
          ) : (
            /* Action Buttons to open Camera or Upload */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => startCamera("environment")}
                className="p-6 rounded-2xl border-2 border-dashed border-primary/30 hover:border-primary bg-primary/5 hover:bg-primary/10 transition-all text-left flex flex-col justify-between group"
              >
                <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center mb-4 shadow-sm group-hover:scale-105 transition-transform">
                  <Camera className="w-6 h-6" />
                </div>
                <div>
                  <h5 className="font-bold text-foreground text-base">Ambil Foto Lewat Kamera</h5>
                  <p className="text-xs text-muted-foreground mt-1">
                    Gunakan kamera HP atau webcam laptop untuk memfoto lembar kertas secara
                    langsung.
                  </p>
                </div>
              </button>

              <label className="p-6 rounded-2xl border-2 border-dashed border-border hover:border-foreground/40 bg-card hover:bg-muted/40 transition-all text-left flex flex-col justify-between cursor-pointer group">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/jpg,image/webp"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-xl bg-muted text-foreground flex items-center justify-center mb-4 shadow-sm group-hover:scale-105 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <h5 className="font-bold text-foreground text-base">Unggah Foto dari Galeri</h5>
                  <p className="text-xs text-muted-foreground mt-1">
                    Pilih satu atau beberapa foto jawaban dari galeri perangkat (format JPG, PNG).
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* Guidelines & Limits Card */}
          <div className="p-4 rounded-xl bg-muted/40 border border-border text-xs space-y-2">
            <span className="font-bold text-foreground block">
              💡 Petunjuk Pengambilan & Batasan Berkas:
            </span>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>
                Maksimal <strong>{MAX_PAGES} halaman</strong> dalam satu pengumpulan.
              </li>
              <li>
                Ukuran per foto maksimal <strong>10MB</strong> (dimensi maksimal 4096px).
              </li>
              <li>
                Pastikan pencahayaan cukup dan foto tidak buram agar teks dapat dibaca oleh OCR
                secara optimal.
              </li>
              <li>
                Anda dapat memeriksa, mengoreksi, atau melengkapi teks hasil pembacaan sebelum
                dikirim.
              </li>
            </ul>
          </div>

          {/* Pages Grid & Organizer */}
          {pages.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-foreground">
                  Daftar Halaman ({pages.length} Halaman Terkumpul):
                </span>
                <span className="text-xs text-muted-foreground">
                  Atur urutan halaman dengan tombol panah sebelum memproses OCR.
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {pages.map((p, index) => (
                  <div
                    key={p.id}
                    className="relative rounded-xl border border-border bg-card p-2 flex flex-col gap-2 group shadow-xs"
                  >
                    <div className="relative aspect-[3/4] bg-muted/50 rounded-lg overflow-hidden flex items-center justify-center">
                      <img
                        src={p.previewUrl}
                        alt={`Halaman ${p.pageNumber}`}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/70 text-white font-mono text-[10px] font-bold">
                        Hal {p.pageNumber}
                      </span>
                    </div>

                    {/* Page Actions toolbar */}
                    <div className="flex items-center justify-between gap-1 pt-1 border-t border-border/40">
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={index === 0}
                          onClick={() => movePage(index, "up")}
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title="Pindah ke kiri / awal"
                        >
                          <ArrowUp className="w-3.5 h-3.5 rotate-[-90deg]" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={index === pages.length - 1}
                          onClick={() => movePage(index, "down")}
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title="Pindah ke kanan / akhir"
                        >
                          <ArrowDown className="w-3.5 h-3.5 rotate-[-90deg]" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => rotatePage(index)}
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title="Putar 90 derajat"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                        </Button>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => retakePage(index)}
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title="Foto Ulang Halaman Ini"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => deletePage(index)}
                          className="h-7 w-7 text-destructive hover:bg-destructive/10"
                          title="Hapus Halaman"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-border/40">
            <Button type="button" variant="outline" onClick={onCancel} disabled={ocrLoading}>
              Batal
            </Button>

            <Button
              type="button"
              disabled={pages.length === 0 || ocrLoading}
              onClick={runOCR}
              className="font-bold flex items-center gap-2"
            >
              {ocrLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memproses OCR...</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>Lanjut: Proses Pembacaan OCR ({pages.length} Halaman)</span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* STEP 2: PROCESSING OCR STATE */}
      {/* ========================================================= */}
      {step === "PROCESSING" && (
        <div className="p-12 text-center rounded-2xl border border-border bg-card space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
          <div>
            <h5 className="font-bold text-foreground text-lg">
              Mengekstraksi Teks dengan Mesin OCR Lokal...
            </h5>
            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
              Memproses {pages.length} halaman gambar. Teks dibaca langsung di server lokal tanpa
              mengirim dokumen ke layanan pihak ketiga.
            </p>
          </div>
          <div className="max-w-xs mx-auto pt-2">
            <Progress value={60} className="h-2" />
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* STEP 3: STUDENT VERIFICATION & CONFIRMATION */}
      {/* ========================================================= */}
      {step === "VERIFY" && activePage && (
        <div className="space-y-6">
          <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs font-medium flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Edit3 className="w-4 h-4 flex-shrink-0" />
              <span>
                Periksa hasil pembacaan OCR di bawah ini. Anda dapat mengedit atau melengkapi teks
                jika ada kata yang salah terbaca sebelum mengonfirmasi pengumpulan.
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setStep("CAPTURE")}
              className="text-xs h-7"
            >
              Ubah/Tambah Halaman
            </Button>
          </div>

          {/* Page Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-border/40">
            {pages.map((p, idx) => {
              const isEdited = p.confirmedText !== p.extractedText;
              const isEmpty = !p.confirmedText.trim();
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSelectedPageIndex(idx);
                    setPreviewZoom(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                    selectedPageIndex === idx
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>Halaman {p.pageNumber}</span>
                  {isEmpty ? (
                    <span className="w-2 h-2 rounded-full bg-amber-500" title="Teks kosong" />
                  ) : isEdited ? (
                    <span className="w-2 h-2 rounded-full bg-blue-400" title="Diedit manual" />
                  ) : (
                    <Check className="w-3 h-3 text-emerald-400" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Side-by-side Page Inspector: Image on Left, Verified Text on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Left: Original Scanned Image with Zoom / Controls */}
            <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <FileImage className="w-4 h-4 text-primary" />
                  Lembar Asli (Halaman {activePage.pageNumber})
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setPreviewZoom((z) => Math.max(0.75, z - 0.25))}
                    className="h-7 w-7"
                    title="Perkecil"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </Button>
                  <span className="text-[11px] font-mono text-muted-foreground px-1">
                    {Math.round(previewZoom * 100)}%
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setPreviewZoom((z) => Math.min(2.5, z + 0.25))}
                    className="h-7 w-7"
                    title="Perbesar"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => rotatePage(selectedPageIndex)}
                    className="h-7 w-7 ml-1"
                    title="Putar 90°"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Scrollable image viewer */}
              <div className="relative w-full aspect-[3/4] bg-muted/40 rounded-xl overflow-auto flex items-center justify-center p-2 border border-border/40">
                <img
                  src={activePage.previewUrl}
                  alt={`Halaman ${activePage.pageNumber}`}
                  style={{ transform: `scale(${previewZoom})`, transformOrigin: "top center" }}
                  className="transition-transform max-w-full max-h-full object-contain rounded-sm"
                />
              </div>
            </div>

            {/* Right: Extracted & Confirmed Text per page */}
            <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground">
                    Teks Terkonfirmasi (Halaman {activePage.pageNumber})
                  </span>
                  {activePage.confirmedText !== activePage.extractedText && (
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold border border-blue-500/20">
                      Telah Dikoreksi
                    </span>
                  )}
                </div>

                {activePage.status === "EMPTY" ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 font-semibold">
                    Halaman Kosong / Tidak Terdeteksi
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-muted-foreground">
                    Akurasi: {Math.round((activePage.confidence || 0.85) * 100)}%
                  </span>
                )}
              </div>

              {activePage.error && (
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs">
                  {activePage.error}
                </div>
              )}

              {/* Editable Confirmed Textarea */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground block">
                  Perbaiki kesalahan ketik atau kata yang belum terbaca:
                </Label>
                <Textarea
                  value={activePage.confirmedText}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPages((prev) => {
                      const updated = [...prev];
                      const curr = updated[selectedPageIndex];
                      if (curr) {
                        updated[selectedPageIndex] = {
                          ...curr,
                          confirmedText: val,
                        };
                      }
                      return updated;
                    });
                  }}
                  rows={14}
                  className="font-mono text-xs leading-relaxed resize-y bg-background"
                  placeholder="Ketik atau koreksi teks lembar jawaban di sini..."
                />
              </div>

              {/* Word & Character count */}
              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                <span>
                  Kata:{" "}
                  {activePage.confirmedText.trim()
                    ? activePage.confirmedText.trim().split(/\s+/).length
                    : 0}{" "}
                  • Karakter: {activePage.confirmedText.length}
                </span>

                {/* Reset to raw OCR */}
                {activePage.confirmedText !== activePage.extractedText && (
                  <button
                    type="button"
                    onClick={() => {
                      setPages((prev) => {
                        const updated = [...prev];
                        const curr = updated[selectedPageIndex];
                        if (curr) {
                          updated[selectedPageIndex] = {
                            ...curr,
                            confirmedText: curr.extractedText,
                          };
                        }
                        return updated;
                      });
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    Kembalikan ke Teks OCR Awal
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep("CAPTURE")}
              disabled={submitting}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Kembali ke Pengaturan Halaman
            </Button>

            <Button
              type="button"
              onClick={handleFinalSubmit}
              disabled={submitting}
              className="font-bold flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Mengumpulkan Jawaban...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Konfirmasi & Kumpulkan Jawaban ({pages.length} Halaman)</span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function loggerError(...args: any[]) {
  if (process.env.NODE_ENV !== "production") {
    console.error(...args);
  }
}
