import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { extractTextFromFile } from "@/lib/ai/extract-text";
import { gradeSubmission, GradingError } from "@/lib/ai/grading-client";

// POST /api/submissions/[submissionId]/grade — Trigger AI grading
export async function POST(
  request: Request,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "DOSEN") {
    return NextResponse.json(
      { error: "Hanya dosen yang dapat memicu penilaian AI" },
      { status: 403 }
    );
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

  if (!submission) {
    return NextResponse.json(
      { error: "Pengumpulan tugas tidak ditemukan" },
      { status: 404 }
    );
  }

  // Verify dosen owns the class
  if (submission.assignment.class.dosenId !== session.user.id) {
    return NextResponse.json(
      { error: "Anda bukan pengajar kelas ini" },
      { status: 403 }
    );
  }

  try {
    // 1. Extract text from submission
    let studentAnswer = "";

    if (submission.type === "TEXT") {
      studentAnswer = submission.content || "";
    } else if (submission.type === "PDF" || submission.type === "DOCX") {
      if (!submission.fileUrl) {
        return NextResponse.json(
          { error: "File dokumen tidak ditemukan di server" },
          { status: 400 }
        );
      }
      studentAnswer = await extractTextFromFile(submission.fileUrl, submission.type);
    }

    if (!studentAnswer.trim()) {
      return NextResponse.json(
        { error: "Jawaban mahasiswa kosong atau tidak dapat diekstraksi" },
        { status: 400 }
      );
    }

    // 2. Prepare rubric criteria with answer keys, materials & embeddings
    let rubricCriteria = submission.assignment.rubric?.criteria.map((c) => ({
      id: c.id,
      label: c.label,
      description: c.description,
      maxScore: c.maxScore,
      weight: c.weight,
      expectedAnswer: c.expectedAnswer,
      answerKey: c.answerKey,
      material: c.material,
      answerKeyEmbedding: c.answerKeyEmbedding as number[] | null,
      materialEmbedding: c.materialEmbedding as number[] | null,
    }));

    // Fallback if assignment doesn't have a rubric
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

    // 3. Call AI Grading Client (with vector embedding similarity)
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

    // 4. Save AIEvaluation to DB
    const aiEvaluation = await prisma.aIEvaluation.upsert({
      where: { submissionId },
      update: {
        rawModelOutput: gradingResult.rawOutput as object,
        perCriterionScore: gradingResult.response.perCriterion as unknown as object,
        suggestedTotalScore: gradingResult.response.suggestedTotalScore,
        suggestedFeedback: gradingResult.response.suggestedFeedback,
        tokenUsage: gradingResult.tokenUsage as object,
      },
      create: {
        submissionId,
        rawModelOutput: gradingResult.rawOutput as object,
        perCriterionScore: gradingResult.response.perCriterion as unknown as object,
        suggestedTotalScore: gradingResult.response.suggestedTotalScore,
        suggestedFeedback: gradingResult.response.suggestedFeedback,
        tokenUsage: gradingResult.tokenUsage as object,
      },
    });

    // 5. Update submission status to AI_REVIEWED
    await prisma.submission.update({
      where: { id: submissionId },
      data: { status: "AI_REVIEWED" },
    });

    return NextResponse.json({
      success: true,
      aiEvaluation,
    });
  } catch (error) {
    // Revert status to SUBMITTED if failed
    await prisma.submission.update({
      where: { id: submissionId },
      data: { status: "SUBMITTED" },
    });

    console.error("AI Grading error:", error);
    if (error instanceof GradingError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Terjadi kesalahan saat memproses penilaian AI" },
      { status: 500 }
    );
  }
}
