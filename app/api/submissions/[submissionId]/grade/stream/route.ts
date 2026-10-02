import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { extractTextFromFile } from "@/lib/ai/extract-text";
import { gradeSubmission, GradingError } from "@/lib/ai/grading-client";

// GET /api/submissions/[submissionId]/grade/stream — Server-Sent Events for AI Grading
export async function GET(
  request: Request,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "DOSEN") {
    return new Response("Unauthorized", { status: 401 });
  }

  const { submissionId } = await params;

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      assignment: {
        include: {
          class: true,
          rubric: {
            include: { criteria: true },
          },
        },
      },
      user: {
        select: { id: true, name: true },
      },
    },
  });

  if (!submission || !submission.activeVersionId || submission.assignment.class.dosenId !== session.user.id) {
    return new Response("Not found, no active version, or forbidden", { status: 404 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      try {
        sendEvent("status", {
          step: 1,
          totalSteps: 4,
          message: "Memuat dokumen jawaban mahasiswa...",
        });

        const activeVersion = await prisma.submissionVersion.findUnique({
          where: { id: submission.activeVersionId! }
        });

        if (!activeVersion) {
          throw new Error("Versi jawaban tidak ditemukan");
        }

        // 1. Text extraction
        let studentAnswer = "";
        if (activeVersion.type === "TEXT") {
          studentAnswer = activeVersion.content || "";
        } else if (activeVersion.type === "PDF" || activeVersion.type === "DOCX") {
          sendEvent("status", {
            step: 2,
            totalSteps: 4,
            message: `Mengekstrak teks dari dokumen ${activeVersion.type}...`,
          });

          if (!activeVersion.fileUrl) {
            throw new Error("File dokumen tidak ditemukan di server");
          }
          studentAnswer = await extractTextFromFile(activeVersion.fileUrl, activeVersion.type);
        }

        if (!studentAnswer.trim()) {
          throw new Error("Jawaban mahasiswa kosong atau tidak dapat dibaca");
        }

        // 2. Prepare rubric
        sendEvent("status", {
          step: 3,
          totalSteps: 4,
          message: "Menganalisis instruksi tugas & kriteria rubrik...",
        });

        let rubricCriteria = submission.assignment.rubric?.criteria.map((c) => ({
          id: c.id,
          label: c.label,
          description: c.description,
          maxScore: c.maxScore,
          weight: c.weight,
        }));

        if (!rubricCriteria || rubricCriteria.length === 0) {
          rubricCriteria = [
            {
              id: "general-eval",
              label: "Evaluasi Keseluruhan Instruksi Tugas",
              description: "Kesesuaian dan kedalaman jawaban terhadap instruksi yang diberikan",
              maxScore: submission.assignment.maxScore,
              weight: 100,
            },
          ];
        }

        // 3. Call AI LLM
        sendEvent("status", {
          step: 4,
          totalSteps: 4,
          message: "Memproses evaluasi dengan AI Copilot (Groq)...",
        });

        const gradingResult = await gradeSubmission(
          {
            assignmentTitle: submission.assignment.title,
            assignmentInstructions: submission.assignment.instructions,
            rubricCriteria,
            studentAnswer,
            maxScore: submission.assignment.maxScore,
          },
          session.user.id,
          request.signal
        );

        if (request.signal.aborted) {
          throw new Error("Pekerjaan dibatalkan oleh pengguna (Cancel)");
        }

        // 4. Save EvaluationRun
        const aiEvaluation = await prisma.evaluationRun.create({
          data: {
            submissionId,
            versionId: activeVersion.id,
            rawModelOutput: gradingResult.rawOutput as object,
            perCriterionScore: gradingResult.response.perCriterion as object,
            suggestedTotalScore: gradingResult.response.suggestedTotalScore,
            suggestedFeedback: gradingResult.response.suggestedFeedback,
            tokenUsage: gradingResult.tokenUsage as object,
            status: "COMPLETED",
          }
        });

        sendEvent("done", {
          success: true,
          aiEvaluation,
        });

        controller.close();
      } catch (err) {
        const errorMsg =
          err instanceof GradingError
            ? err.message
            : err instanceof Error
            ? err.message
            : "Terjadi kesalahan saat memproses penilaian AI";

        if (request.signal.aborted) {
          console.log(`[Stream] Job aborted by client for submission ${submissionId}`);
        } else {
          sendEvent("error", { message: errorMsg });
          controller.close();
        }
      }
    },
    cancel() {
      // Stream cancelled by client
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
