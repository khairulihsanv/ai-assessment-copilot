"use client";

import { useState, useCallback } from "react";

interface GradingStep {
  step: number;
  totalSteps: number;
  message: string;
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

  const [eventSourceRef, setEventSourceRef] = useState<EventSource | null>(null);

  const reset = useCallback(() => {
    setGrading(false);
    setCurrentStep(null);
    setError(null);
    if (eventSourceRef) {
      eventSourceRef.close();
      setEventSourceRef(null);
    }
  }, [eventSourceRef]);

  const cancelGrading = useCallback(() => {
    if (eventSourceRef) {
      eventSourceRef.close();
      setEventSourceRef(null);
      setGrading(false);
      setError("Dibatalkan oleh pengguna");
    }
  }, [eventSourceRef]);

  const startGrading = useCallback((submissionId: string): Promise<unknown> => {
    return new Promise((resolve, reject) => {
      setGrading(true);
      setError(null);
      setCurrentStep({
        step: 1,
        totalSteps: 4,
        message: "Menghubungkan ke layanan AI Copilot...",
      });

      const eventSource = new EventSource(
        `/api/submissions/${submissionId}/grade/stream`
      );
      setEventSourceRef(eventSource);

      eventSource.addEventListener("status", (e) => {
        try {
          const data = JSON.parse(e.data);
          setCurrentStep(data);
        } catch {
          // ignore parse error
        }
      });

      eventSource.addEventListener("done", (e) => {
        eventSource.close();
        setGrading(false);
        try {
          const data = JSON.parse(e.data);
          resolve(data);
        } catch {
          resolve(null);
        }
      });

      eventSource.addEventListener("error", (e: unknown) => {
        eventSource.close();
        setGrading(false);
        let errorMsg = "Gagal memproses penilaian dengan AI";
        if (e && typeof e === "object" && "data" in e) {
          try {
            const data = JSON.parse((e as { data: string }).data);
            if (data.message) errorMsg = data.message;
          } catch {
            // default
          }
        }
        setError(errorMsg);
        reject(new Error(errorMsg));
      });
    });
  }, []);

  return { grading, currentStep, error, startGrading, cancelGrading, reset };
}
