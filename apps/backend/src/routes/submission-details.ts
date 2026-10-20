import { Hono } from "hono";
import { z } from "zod";
import { extractTextFromFile } from "../ai/extract-text.js";
import { GradingError, gradeSubmission } from "../ai/grading-client.js";
import { prisma } from "../db/prisma.js";
import { type AuthContext, internalAuthMiddleware } from "../middleware/auth.js";

const submissionDetailsRouter = new Hono<AuthContext>();
submissionDetailsRouter.use("*", internalAuthMiddleware);

const finalizeSchema = z.object({
  expectedSubmissionVersionId: z.string().min(1),
  expectedReleasedGradeId: z.string().min(1).nullable(),
  finalScore: z.number().min(0, "Skor minimal 0"),
  finalFeedback: z.string().min(3, "Umpan balik wajib diisi minimal 3 karakter"),
  isAIAssisted: z.boolean().default(false),
  editedFromAI: z.boolean().default(false),
});

submissionDetailsRouter.get("/:submissionId", async (c) => {
  const user = c.get("user");
  const submissionId = c.req.param("submissionId");

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    select: {
      id: true,
      assignmentId: true,
      userId: true,
      activeVersionId: true,
      releasedGradeId: true,
      createdAt: true,
      user: {
        select: { id: true, name: true, email: true },
      },
      assignment: {
        select: {
          id: true,
          title: true,
          instructions: true,
          submissionType: true,
          dueDate: true,
          maxScore: true,
          classId: true,
          class: {
            select: { id: true, name: true, dosenId: true },
          },
          rubric: {
            select: {
              id: true,
              title: true,
              criteria: {
                select: {
                  id: true,
                  label: true,
                  description: true,
                  maxScore: true,
                  weight: true,
                  expectedAnswer: true,
                  answerKey: true,
                  material: true,
                  rubricId: true,
                },
              },
            },
          },
        },
      },
      evaluations: {
        select: {
          id: true,
          submissionId: true,
          versionId: true,
          rawModelOutput: true,
          perCriterionScore: true,
          suggestedTotalScore: true,
          suggestedFeedback: true,
          tokenUsage: true,
          status: true,
          createdAt: true,
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      },
      grades: {
        select: {
          id: true,
          submissionId: true,
          versionId: true,
          status: true,
          finalScore: true,
          finalFeedback: true,
          isAIAssisted: true,
          editedFromAI: true,
          gradedById: true,
          createdAt: true,
        },
      },
      versions: {
        select: {
          id: true,
          submissionId: true,
          versionNumber: true,
          type: true,
          fileUrl: true,
          fileName: true,
          content: true,
          submittedAt: true,
        },
      },
    },
  });

  if (!submission) return c.json({ error: "Pengumpulan tidak ditemukan" }, 404);

  const isDosen = submission.assignment.class.dosenId === user.id;
  const isStudent = submission.userId === user.id;

  if (!isDosen && !isStudent) {
    return c.json({ error: "Akses ditolak" }, 403);
  }

  if (!isDosen) {
    return c.json({
      ...submission,
      evaluations: [],
      grades: submission.grades.filter(
        (g) => g.id === submission.releasedGradeId && g.status === "RELEASED",
      ),
    });
  }

  return c.json(submission);
});

submissionDetailsRouter.post("/:submissionId/grade", async (c) => {
  const user = c.get("user");
  if (user.role !== "DOSEN")
    return c.json({ error: "Hanya dosen yang dapat memicu penilaian AI" }, 403);

  const submissionId = c.req.param("submissionId");
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      assignment: { include: { class: true, rubric: { include: { criteria: true } } } },
      user: { select: { id: true, name: true } },
    },
  });

  if (!submission || !submission.activeVersionId) {
    return c.json({ error: "Pengumpulan tugas tidak ditemukan atau belum memiliki versi" }, 404);
  }

  if (submission.assignment.class.dosenId !== user.id)
    return c.json({ error: "Anda bukan pengajar kelas ini" }, 403);

  try {
    const activeVersion = await prisma.submissionVersion.findUnique({
      where: { id: submission.activeVersionId },
    });
    if (!activeVersion) return c.json({ error: "Versi jawaban tidak ditemukan" }, 404);

    let studentAnswer = "";
    if (activeVersion.type === "TEXT") {
      studentAnswer = activeVersion.content || "";
    } else if (activeVersion.type === "PDF" || activeVersion.type === "DOCX") {
      if (!activeVersion.fileUrl)
        return c.json({ error: "File dokumen tidak ditemukan di server" }, 400);
      studentAnswer = await extractTextFromFile(activeVersion.fileUrl, activeVersion.type);
    }

    if (!studentAnswer.trim())
      return c.json({ error: "Jawaban mahasiswa kosong atau tidak dapat diekstraksi" }, 400);

    let rubricCriteria = submission.assignment.rubric?.criteria.map((cr) => ({
      id: cr.id,
      label: cr.label,
      description: cr.description,
      maxScore: cr.maxScore,
      weight: cr.weight,
      expectedAnswer: cr.expectedAnswer,
      answerKey: cr.answerKey,
      material: cr.material,
      answerKeyEmbedding: cr.answerKeyEmbedding as number[] | null,
      materialEmbedding: cr.materialEmbedding as number[] | null,
    }));

    if (!rubricCriteria || rubricCriteria.length === 0) {
      rubricCriteria = [
        {
          id: "general-eval",
          label: "Evaluasi Keseluruhan Instruksi Tugas",
          description: "Kesesuaian dan kedalaman jawaban terhadap instruksi yang diberikan",
          maxScore: submission.assignment.maxScore,
          weight: 100,
          expectedAnswer: null,
          answerKey: null,
          material: null,
          answerKeyEmbedding: null,
          materialEmbedding: null,
        },
      ];
    }

    const gradingResult = await gradeSubmission(
      {
        assignmentId: submission.assignmentId,
        assignmentTitle: submission.assignment.title,
        assignmentInstructions: submission.assignment.instructions,
        rubricCriteria,
        studentAnswer,
        maxScore: submission.assignment.maxScore,
      },
      user.id,
    );

    const aiEvaluation = await prisma.evaluationRun.create({
      data: {
        submissionId,
        versionId: activeVersion.id,
        rawModelOutput: gradingResult.rawOutput as object,
        perCriterionScore: gradingResult.response.perCriterion as unknown as object,
        suggestedTotalScore: gradingResult.response.suggestedTotalScore,
        suggestedFeedback: gradingResult.response.suggestedFeedback,
        tokenUsage: gradingResult.tokenUsage as object,
        status: "COMPLETED",
      },
    });

    return c.json({ success: true, aiEvaluation });
  } catch (error) {
    console.error("AI Grading error:", error);
    if (error instanceof GradingError)
      return c.json({ error: error.message, code: error.code }, 400);
    return c.json(
      {
        error:
          error instanceof Error ? error.message : "Terjadi kesalahan saat memproses penilaian AI",
      },
      500,
    );
  }
});

submissionDetailsRouter.post("/:submissionId/finalize", async (c) => {
  const user = c.get("user");
  if (user.role !== "DOSEN")
    return c.json({ error: "Hanya dosen yang dapat memfinalisasi nilai" }, 403);

  const submissionId = c.req.param("submissionId");
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { assignment: { include: { class: true } } },
  });

  if (!submission) return c.json({ error: "Pengumpulan tugas tidak ditemukan" }, 404);
  if (submission.assignment.class.dosenId !== user.id)
    return c.json({ error: "Anda bukan pengajar kelas ini" }, 403);

  try {
    const body = await c.req.json();
    const parsed = finalizeSchema.safeParse(body);
    if (!parsed.success)
      return c.json({ error: parsed.error.issues[0]?.message ?? "Data nilai tidak valid" }, 400);

    const {
      finalScore,
      finalFeedback,
      isAIAssisted,
      editedFromAI,
      expectedSubmissionVersionId,
      expectedReleasedGradeId,
    } = parsed.data;

    if (
      submission.activeVersionId !== expectedSubmissionVersionId ||
      submission.releasedGradeId !== expectedReleasedGradeId
    ) {
      return c.json(
        { error: "Jawaban atau nilai telah berubah. Muat ulang sebelum merilis." },
        409,
      );
    }

    if (finalScore > submission.assignment.maxScore) {
      return c.json(
        {
          error: `Skor tidak boleh melebihi skor maksimal tugas (${submission.assignment.maxScore})`,
        },
        400,
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const grade = await tx.gradeRevision.create({
        data: {
          submissionId,
          versionId: expectedSubmissionVersionId,
          status: "RELEASED",
          finalScore,
          finalFeedback,
          isAIAssisted,
          editedFromAI,
          gradedById: user.id,
        },
      });

      const changed = await tx.submission.updateMany({
        where: {
          id: submissionId,
          activeVersionId: expectedSubmissionVersionId,
          releasedGradeId: expectedReleasedGradeId,
        },
        data: { releasedGradeId: grade.id },
      });

      if (changed.count !== 1) throw new Error("GRADE_CONFLICT");

      if (expectedReleasedGradeId) {
        await tx.gradeRevision.updateMany({
          where: { id: expectedReleasedGradeId, submissionId, status: "RELEASED" },
          data: { status: "SUPERSEDED" },
        });
      }

      return grade;
    });

    return c.json({ success: true, grade: result });
  } catch (error) {
    if (error instanceof Error && error.message === "GRADE_CONFLICT") {
      return c.json(
        { error: "Jawaban atau nilai telah berubah. Muat ulang sebelum merilis." },
        409,
      );
    }
    console.error("Finalize grade error:", error);
    return c.json({ error: "Gagal memfinalisasi nilai tugas" }, 500);
  }
});

submissionDetailsRouter.get("/:submissionId/grade/stream", async (c) => {
  const user = c.get("user");
  if (user.role !== "DOSEN") {
    return c.text("Unauthorized", 401);
  }

  const submissionId = c.req.param("submissionId");

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

  if (
    !submission ||
    !submission.activeVersionId ||
    submission.assignment.class.dosenId !== user.id
  ) {
    return c.text("Not found, no active version, or forbidden", 404);
  }

  const encoder = new TextEncoder();
  const signal = c.req.raw.signal;

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        sendEvent("status", {
          step: 1,
          totalSteps: 4,
          message: "Memuat dokumen jawaban mahasiswa...",
        });

        const activeVersion = await prisma.submissionVersion.findUnique({
          where: { id: submission.activeVersionId! },
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

        let rubricCriteria = submission.assignment.rubric?.criteria.map((cr) => ({
          id: cr.id,
          label: cr.label,
          description: cr.description,
          maxScore: cr.maxScore,
          weight: cr.weight,
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
            assignmentId: submission.assignmentId,
            assignmentTitle: submission.assignment.title,
            assignmentInstructions: submission.assignment.instructions,
            rubricCriteria,
            studentAnswer,
            maxScore: submission.assignment.maxScore,
          },
          user.id,
          signal,
        );

        if (signal?.aborted) {
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
          },
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

        if (signal?.aborted) {
          console.log(`[Stream] Job aborted by client for submission ${submissionId}`);
        } else {
          sendEvent("error", { message: errorMsg });
          controller.close();
        }
      }
    },
    cancel() {
      // Stream cancelled by client
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});

export default submissionDetailsRouter;
