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
      mahasiswa: {
        select: { id: true, name: true },
      },
    },
  });

  if (!submission || submission.assignment.class.dosenId !== session.user.id) {
    return new Response("Not found or forbidden", { status: 404 });
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

        // 1. Text extraction
        let studentAnswer = "";
        if (submission.type === "TEXT") {
          studentAnswer = submission.content || "";
        } else if (submission.type === "PDF" || submission.type === "DOCX") {
          sendEvent("status", {
            step: 2,
            totalSteps: 4,
            message: `Mengekstrak teks dari dokumen ${submission.type}...`,
          });

          if (!submission.fileUrl) {
            throw new Error("File dokumen tidak ditemukan di server");
          }
          studentAnswer = await extractTextFromFile(submission.fileUrl, submission.type);
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
          message: "Memproses evaluasi dengan AI (Google Gemini)...",
        });

        await prisma.submission.update({
          where: { id: submissionId },
          data: { status: "AI_PROCESSING" },
        });

        const gradingResult = await gradeSubmission(
          {
            assignmentTitle: submission.assignment.title,
            assignmentInstructions: submission.assignment.instructions,
            rubricCriteria,
            studentAnswer,
            maxScore: submission.assignment.maxScore,
          },
          session.user.id
        );

        // 4. Save AIEvaluation
        const aiEvaluation = await prisma.aIEvaluation.upsert({
          where: { submissionId },
          update: {
            rawModelOutput: gradingResult.rawOutput as object,
            perCriterionScore: gradingResult.response.perCriterion as object,
            suggestedTotalScore: gradingResult.response.suggestedTotalScore,
            suggestedFeedback: gradingResult.response.suggestedFeedback,
            tokenUsage: gradingResult.tokenUsage as object,
          },
          create: {
            submissionId,
            rawModelOutput: gradingResult.rawOutput as object,
            perCriterionScore: gradingResult.response.perCriterion as object,
            suggestedTotalScore: gradingResult.response.suggestedTotalScore,
            suggestedFeedback: gradingResult.response.suggestedFeedback,
            tokenUsage: gradingResult.tokenUsage as object,
          },
        });

        await prisma.submission.update({
          where: { id: submissionId },
          data: { status: "AI_REVIEWED" },
        });

        sendEvent("done", {
          success: true,
          aiEvaluation,
        });

        controller.close();
      } catch (err) {
        await prisma.submission.update({
          where: { id: submissionId },
          data: { status: "SUBMITTED" },
        });

        const errorMsg =
          err instanceof GradingError
            ? err.message
            : err instanceof Error
            ? err.message
            : "Terjadi kesalahan saat memproses penilaian AI";

        sendEvent("error", { message: errorMsg });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
