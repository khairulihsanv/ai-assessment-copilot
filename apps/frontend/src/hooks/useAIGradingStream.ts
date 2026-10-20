"use client";

import { useCallback, useRef, useState } from "react";

interface GradingStep {
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

export function useAIGradingStream(): UseAIGradingStreamReturn {
  const [grading, setGrading] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<GradingStep | null>(null);
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const rejectCurrentRef = useRef<((reason?: any) => void) | null>(null);

  const reset = useCallback(() => {
    setGrading(false);
    setCurrentStep(null);
    setError(null);
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (rejectCurrentRef.current) {
      rejectCurrentRef.current(new Error("Reset oleh pengguna"));
      rejectCurrentRef.current = null;
    }
  }, []);

  const cancelGrading = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setGrading(false);
    setError("Dibatalkan oleh pengguna");
    if (rejectCurrentRef.current) {
      rejectCurrentRef.current(new Error("Dibatalkan oleh pengguna"));
      rejectCurrentRef.current = null;
    }
  }, []);

  const startGrading = useCallback((submissionId: string): Promise<unknown> => {
    if (eventSourceRef.current) {
      return Promise.reject(
        new Error("Penilaian sedang berjalan. Harap tunggu hingga proses selesai."),
      );
    }

    return new Promise((resolve, reject) => {
      setGrading(true);
      setError(null);
      setCurrentStep({
        step: 1,
        totalSteps: 4,
        message: "Menghubungkan ke layanan AI Copilot...",
        progress: 10,
      });

      rejectCurrentRef.current = reject;

      const eventSource = new EventSource(`/api/submissions/${submissionId}/grade/stream`);
      eventSourceRef.current = eventSource;

      eventSource.addEventListener("status", (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          setCurrentStep(data);
        } catch {
          // ignore parse error
        }
      });

      eventSource.addEventListener("done", (e: MessageEvent) => {
        eventSource.close();
        eventSourceRef.current = null;
        rejectCurrentRef.current = null;
        setGrading(false);
        try {
          const data = JSON.parse(e.data);
          resolve(data);
        } catch {
          resolve(null);
        }
      });

      eventSource.addEventListener("error", (e: any) => {
        eventSource.close();
        eventSourceRef.current = null;
        const rejectFn = rejectCurrentRef.current;
        rejectCurrentRef.current = null;
        setGrading(false);

        let errorMsg = "Gagal memproses penilaian dengan AI";
        if (e && typeof e === "object" && "data" in e && typeof e.data === "string") {
          try {
            const data = JSON.parse(e.data);
            if (data.message) errorMsg = data.message;
          } catch {
            // default
          }
        }
        setError(errorMsg);
        if (rejectFn) {
          rejectFn(new Error(errorMsg));
        }
      });
    });
  }, []);

  return { grading, currentStep, error, startGrading, cancelGrading, reset };
}
