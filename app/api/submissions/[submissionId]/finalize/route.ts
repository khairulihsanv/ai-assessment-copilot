import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const finalizeSchema = z.object({
  expectedSubmissionVersionId: z.string().min(1),
  expectedReleasedGradeId: z.string().min(1).nullable(),
  finalScore: z.number().min(0, "Skor minimal 0"),
  finalFeedback: z.string().min(3, "Umpan balik wajib diisi minimal 3 karakter"),
  isAIAssisted: z.boolean().default(false),
  editedFromAI: z.boolean().default(false),
});

// POST /api/submissions/[submissionId]/finalize — Dosen finalizes grade
export async function POST(
  request: Request,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "DOSEN") {
    return NextResponse.json(
      { error: "Hanya dosen yang dapat memfinalisasi nilai" },
      { status: 403 }
    );
  }

  const { submissionId } = await params;

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      assignment: {
        include: { class: true },
      },
    },
  });

  if (!submission) {
    return NextResponse.json(
      { error: "Pengumpulan tugas tidak ditemukan" },
      { status: 404 }
    );
  }

  if (submission.assignment.class.dosenId !== session.user.id) {
    return NextResponse.json(
      { error: "Anda bukan pengajar kelas ini" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const parsed = finalizeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Data nilai tidak valid" },
        { status: 400 }
      );
    }

    const { finalScore, finalFeedback, isAIAssisted, editedFromAI, expectedSubmissionVersionId, expectedReleasedGradeId } = parsed.data;

    if (submission.activeVersionId !== expectedSubmissionVersionId || submission.releasedGradeId !== expectedReleasedGradeId) {
      return NextResponse.json({ error: "Jawaban atau nilai telah berubah. Muat ulang sebelum merilis." }, { status: 409 });
    }

    if (finalScore > submission.assignment.maxScore) {
      return NextResponse.json(
        { error: `Skor tidak boleh melebihi skor maksimal tugas (${submission.assignment.maxScore})` },
        { status: 400 }
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
          gradedById: session.user.id,
        },
      });

      const changed = await tx.submission.updateMany({
        where: { id: submissionId, activeVersionId: expectedSubmissionVersionId, releasedGradeId: expectedReleasedGradeId },
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

    return NextResponse.json({ success: true, grade: result });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: "JSON tidak valid" }, { status: 400 });
    if (error instanceof Error && error.message === "GRADE_CONFLICT") {
      return NextResponse.json({ error: "Jawaban atau nilai telah berubah. Muat ulang sebelum merilis." }, { status: 409 });
    }
    console.error("Finalize grade error:", error);
    return NextResponse.json(
      { error: "Gagal memfinalisasi nilai tugas" },
      { status: 500 }
    );
  }
}
