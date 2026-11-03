"use client";

import { useCallback, useRef, useState } from "react";
import { getErrorMessage } from "@/shared/utils/api-error";

export interface GradingStep {
  step: number;
  totalSteps: number;
  message: string;
  progress?: number;
}

interface UseAIGradingStreamReturn {
  grading: boolean;
  currentStep: GradingStep | null;
  error: string | null;
  startGrading: (submissionId: string) => Promise<unknown>;
  cancelGrading: () => void;
  reset: () => void;
}

const CANCELLED = "Dibatalkan oleh dosen. Draf AI tidak disimpan.";
const DISCONNECTED =
  "Koneksi ke server terputus saat model sedang bekerja. Muat ulang halaman untuk melihat apakah draf sempat tersimpan, atau jalankan ulang.";

/**
 * EventSource hides the HTTP status and body when a stream fails to open
 * (403, 400 "belum ada rubrik", 401 …). Re-request once with fetch to surface
 * the backend's message. A 200 response means the failure was transient; we
 * abort immediately so no second grading run proceeds.
 */
async function probeStreamError(url: string): Promise<string> {
  const controller = new AbortController();
  try {
    const res = await fetch(url, {
      headers: { Accept: "text/event-stream" },
      signal: controller.signal,
      cache: "no-store",
    });
    if (res.ok) {
      controller.abort();
      return "Tidak dapat terhubung ke layanan AI. Periksa koneksi lalu coba lagi.";
    }
    if (res.status === 401) return "Sesi Anda berakhir. Silakan masuk kembali.";
    const text = await res.text();
    let body: unknown = text;
    try {
      body = JSON.parse(text);
    } catch {
      // plain-text body
    }
    return getErrorMessage(body, `Layanan AI menolak permintaan (HTTP ${res.status}).`);
  } catch {
    return "Server tidak dapat dihubungi. Periksa koneksi lalu coba lagi.";
  }
}

export function useAIGradingStream(): UseAIGradingStreamReturn {
  const [grading, setGrading] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<GradingStep | null>(null);
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const rejectCurrentRef = useRef<((reason?: unknown) => void) | null>(null);

  const closeStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    closeStream();
    setGrading(false);
    setCurrentStep(null);
    setError(null);
    if (rejectCurrentRef.current) {
      rejectCurrentRef.current(new Error("Reset"));
      rejectCurrentRef.current = null;
    }
  }, [closeStream]);

  const cancelGrading = useCallback(() => {
    closeStream();
    setGrading(false);
    setCurrentStep(null);
    setError(CANCELLED);
    if (rejectCurrentRef.current) {
      rejectCurrentRef.current(new Error(CANCELLED));
      rejectCurrentRef.current = null;
    }
  }, [closeStream]);

  const startGrading = useCallback(
    (submissionId: string): Promise<unknown> => {
      if (eventSourceRef.current) {
        return Promise.reject(new Error("Draf AI sedang disusun. Tunggu hingga selesai."));
      }

      return new Promise((resolve, reject) => {
        const url = `/api/submissions/${submissionId}/grade/stream`;
        setGrading(true);
        setError(null);
        setCurrentStep({
          step: 0,
          totalSteps: 4,
          message: "Menghubungkan ke layanan AI…",
          progress: 5,
        });
        rejectCurrentRef.current = reject;

        let opened = false;
        const eventSource = new EventSource(url);
        eventSourceRef.current = eventSource;

        const fail = (message: string) => {
          closeStream();
          setGrading(false);
          setCurrentStep(null);
          setError(message);
          const rejectFn = rejectCurrentRef.current;
          rejectCurrentRef.current = null;
          rejectFn?.(new Error(message));
        };

        eventSource.onopen = () => {
          opened = true;
        };

        eventSource.addEventListener("status", (e: MessageEvent) => {
          opened = true;
          try {
            setCurrentStep(JSON.parse(e.data) as GradingStep);
          } catch {
            // ignore malformed progress frames
          }
        });

        eventSource.addEventListener("done", (e: MessageEvent) => {
          closeStream();
          rejectCurrentRef.current = null;
          setGrading(false);
          setCurrentStep(null);
          try {
            resolve(JSON.parse(e.data));
          } catch {
            resolve(null);
          }
        });

        // Two kinds of "error": a server-sent `event: error` frame (has data),
        // or a transport failure (no data). Never let EventSource auto-reconnect:
        // a reconnect would start a second grading run.
        eventSource.addEventListener("error", (e: Event) => {
          const data = (e as MessageEvent).data;
          if (typeof data === "string" && data) {
            let message = "Draf AI tidak dapat dibuat.";
            try {
              message = getErrorMessage(JSON.parse(data), message);
            } catch {
              // keep default
            }
            fail(message);
            return;
          }

          if (eventSourceRef.current !== eventSource) return; // already handled or cancelled
          eventSource.close();
          if (opened) {
            fail(DISCONNECTED);
          } else {
            void probeStreamError(url).then(fail);
          }
        });
      });
    },
    [closeStream],
  );

  return { grading, currentStep, error, startGrading, cancelGrading, reset };
}
