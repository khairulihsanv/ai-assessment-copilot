"use client";

import { useCallback, useState } from "react";
import { getErrorMessage } from "@/shared/utils/api-error";

interface UploadOptions {
  url: string;
  body: FormData | Record<string, unknown>;
  isFormData?: boolean;
  headers?: Record<string, string>;
}

interface UseUploadProgressReturn {
  progress: number;
  uploading: boolean;
  error: string | null;
  startUpload: (options: UploadOptions) => Promise<unknown>;
  reset: () => void;
}

export function useUploadProgress(): UseUploadProgressReturn {
  const [progress, setProgress] = useState<number>(0);
  const [uploading, setUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setProgress(0);
    setUploading(false);
    setError(null);
  }, []);

  const startUpload = useCallback(
    ({ url, body, isFormData = true, headers }: UploadOptions): Promise<unknown> => {
      return new Promise((resolve, reject) => {
        setUploading(true);
        setProgress(0);
        setError(null);

        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            setProgress(percentComplete);
          }
        });

        xhr.addEventListener("load", () => {
          setUploading(false);
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const res = JSON.parse(xhr.responseText);
              resolve(res);
            } catch {
              resolve(xhr.responseText);
            }
          } else {
            // 413 from the hosting platform itself (Vercel caps a request body at ~4.5MB): no JSON body.
            let errorMsg =
              xhr.status === 413
                ? "File terlalu besar untuk server saat ini. Kompres PDF (mis. ukuran gambar diperkecil) lalu unggah lagi."
                : "Gagal mengunggah jawaban";
            try {
              // BFF routes answer { error }, the backend itself (direct upload) { detail }.
              errorMsg = getErrorMessage(JSON.parse(xhr.responseText), errorMsg);
            } catch {
              // use default
            }
            setError(errorMsg);
            reject(new Error(errorMsg));
          }
        });

        xhr.addEventListener("error", () => {
          setUploading(false);
          const errorMsg = "Terjadi kegagalan koneksi jaringan saat mengunggah";
          setError(errorMsg);
          reject(new Error(errorMsg));
        });

        xhr.addEventListener("abort", () => {
          setUploading(false);
          setError("Pengunggahan dibatalkan");
          reject(new Error("Pengunggahan dibatalkan"));
        });

        xhr.open("POST", url, true);
        for (const [name, value] of Object.entries(headers ?? {})) {
          xhr.setRequestHeader(name, value);
        }

        if (!isFormData) {
          xhr.setRequestHeader("Content-Type", "application/json");
          xhr.send(JSON.stringify(body));
        } else {
          xhr.send(body as FormData);
        }
      });
    },
    [],
  );

  return { progress, uploading, error, startUpload, reset };
}
