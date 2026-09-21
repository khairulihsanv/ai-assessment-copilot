import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const finalizeSchema = z.object({
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
  if (!session?.user || session.user.role !== "DOSEN") {
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

    const { finalScore, finalFeedback, isAIAssisted, editedFromAI } = parsed.data;

    if (finalScore > submission.assignment.maxScore) {
      return NextResponse.json(
        { error: `Skor tidak boleh melebihi skor maksimal tugas (${submission.assignment.maxScore})` },
        { status: 400 }
      );
    }

    // Upsert Grade in transaction & update submission status
    const result = await prisma.$transaction(async (tx) => {
      const grade = await tx.grade.upsert({
        where: { submissionId },
        update: {
          finalScore,
          finalFeedback,
          isAIAssisted,
          editedFromAI,
          gradedAt: new Date(),
          gradedById: session.user.id,
        },
        create: {
          submissionId,
          finalScore,
          finalFeedback,
          isAIAssisted,
          editedFromAI,
          gradedAt: new Date(),
          gradedById: session.user.id,
        },
      });

      await tx.submission.update({
        where: { id: submissionId },
        data: { status: "GRADED" },
      });

      return grade;
    });

    return NextResponse.json({ success: true, grade: result });
  } catch (error) {
    console.error("Finalize grade error:", error);
    return NextResponse.json(
      { error: "Gagal memfinalisasi nilai tugas" },
      { status: 500 }
    );
  }
}
