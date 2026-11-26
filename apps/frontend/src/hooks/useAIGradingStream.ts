"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getErrorMessage } from "@/shared/utils/api-error";

export interface GradingStep {
  step: number;
  totalSteps: number;
  message: string;
  progress?: number;
  tokens?: number;
  elapsedSeconds?: number;
}

interface UseAIGradingStreamReturn {
  grading: boolean;
  currentStep: GradingStep | null;
  error: string | null;
  startGrading: (submissionId: string, options?: { attach?: boolean }) => Promise<unknown>;
  /** Asks the server about an earlier run; true when one is still running. */
  checkRunningJob: (submissionId: string) => Promise<boolean>;
  cancelGrading: () => void;
  reset: () => void;
}

const CANCELLED = "Dibatalkan oleh dosen. Draf AI tidak disimpan.";
// A long draft can outlive one connection (Vercel ends a function after 300 seconds).
const MAX_RECONNECTS = 5;
const RECONNECT_DELAY_MS = 2000;
const DISCONNECTED =
  "Koneksi ke server terputus. Draf tetap diproses di server, muat ulang halaman untuk melihat hasilnya.";

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
  const submissionRef = useRef<string | null>(null);

  const closeStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  // Leaving the page only stops following the draft: the server keeps working on it.
  useEffect(() => closeStream, [closeStream]);

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
    if (submissionRef.current) {
      void fetch(`/api/submissions/${submissionRef.current}/grade/cancel`, {
        method: "POST",
      }).catch(() => {});
    }
    setGrading(false);
    setCurrentStep(null);
    setError(CANCELLED);
    if (rejectCurrentRef.current) {
      rejectCurrentRef.current(new Error(CANCELLED));
      rejectCurrentRef.current = null;
    }
  }, [closeStream]);

  const checkRunningJob = useCallback(async (submissionId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/submissions/${submissionId}/grade/job`, { cache: "no-store" });
      if (!res.ok) return false;
      const job = (await res.json()) as { state?: string; error?: string | null };
      if (job.state === "failed" && job.error) setError(job.error);
      return job.state === "queued" || job.state === "running";
    } catch {
      return false;
    }
  }, []);

  const startGrading = useCallback(
    (submissionId: string, options?: { attach?: boolean }): Promise<unknown> => {
      if (eventSourceRef.current) {
        return Promise.reject(new Error("Draf AI sedang disusun. Tunggu hingga selesai."));
      }

      return new Promise((resolve, reject) => {
        const base = `/api/submissions/${submissionId}/grade/stream`;
        const url = `${base}${options?.attach ? "?attach=1" : ""}`;
        submissionRef.current = submissionId;
        setGrading(true);
        setError(null);
        setCurrentStep({
          step: 0,
          totalSteps: 4,
          message: "Menghubungkan ke layanan AI…",
          progress: 5,
        });
        rejectCurrentRef.current = reject;

        const fail = (message: string) => {
          closeStream();
          setGrading(false);
          setCurrentStep(null);
          setError(message);
          const rejectFn = rejectCurrentRef.current;
          rejectCurrentRef.current = null;
          rejectFn?.(new Error(message));
        };

        const connect = (streamUrl: string, reconnectsLeft: number) => {
          let opened = false;
          const eventSource = new EventSource(streamUrl);
          eventSourceRef.current = eventSource;

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
          // or a transport failure (no data). EventSource must never reconnect by itself:
          // that would request the start URL again and begin a second draft.
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
            eventSourceRef.current = null;
            if (!opened) {
              void probeStreamError(streamUrl).then(fail);
              return;
            }
            // The connection dropped mid-draft (a long read hits the hosting time limit, or the
            // network blinks). The draft keeps running on the server: follow it again, never restart it.
            if (reconnectsLeft <= 0) {
              fail(DISCONNECTED);
              return;
            }
            setTimeout(() => {
              if (rejectCurrentRef.current !== reject) return; // cancelled meanwhile
              connect(`${base}?attach=1`, reconnectsLeft - 1);
            }, RECONNECT_DELAY_MS);
          });
        };

        connect(url, MAX_RECONNECTS);
      });
    },
    [closeStream],
  );

  return { grading, currentStep, error, startGrading, checkRunningJob, cancelGrading, reset };
}
