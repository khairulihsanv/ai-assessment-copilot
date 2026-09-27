import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { createRubricSchema } from "@/lib/validators/rubric";

// GET /api/classes/[classId]/rubrics/[rubricId]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ classId: string; rubricId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { classId, rubricId } = await params;

  const rubric = await prisma.rubric.findFirst({
    where: { id: rubricId, classId },
    include: {
      criteria: true,
      _count: { select: { assignments: true } },
    },
  });

  if (!rubric) {
    return NextResponse.json({ error: "Rubrik tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json(rubric);
}

// DELETE /api/classes/[classId]/rubrics/[rubricId]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ classId: string; rubricId: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "DOSEN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { classId, rubricId } = await params;

  const rubric = await prisma.rubric.findFirst({
    where: { id: rubricId, classId },
    include: {
      _count: { select: { assignments: true } },
    },
  });

  if (!rubric) {
    return NextResponse.json({ error: "Rubrik tidak ditemukan" }, { status: 404 });
  }

  if (rubric._count.assignments > 0) {
    return NextResponse.json(
      { error: `Rubrik ini sedang digunakan oleh ${rubric._count.assignments} tugas. Tidak dapat dihapus.` },
      { status: 400 }
    );
  }

  await prisma.rubric.delete({
    where: { id: rubricId },
  });

  return NextResponse.json({ success: true, message: "Rubrik berhasil dihapus" });
}

// PUT /api/classes/[classId]/rubrics/[rubricId]
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ classId: string; rubricId: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "DOSEN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { classId, rubricId } = await params;

  const existing = await prisma.rubric.findFirst({
    where: { id: rubricId, classId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Rubrik tidak ditemukan" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const parsed = createRubricSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Data rubrik tidak valid" },
        { status: 400 }
      );
    }

    const { title, criteria } = parsed.data;

    // Use transaction to update title and recreate criteria
    const updated = await prisma.$transaction(async (tx) => {
      await tx.rubricCriterion.deleteMany({
        where: { rubricId },
      });

      return tx.rubric.update({
        where: { id: rubricId },
        data: {
          title,
          criteria: {
            create: criteria.map((c) => ({
              label: c.label,
              description: c.description || null,
              expectedAnswer: c.expectedAnswer || null,
              maxScore: c.maxScore,
              weight: c.weight,
            })),
          },
        },
        include: { criteria: true },
      });
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update rubric error:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui rubrik penilaian" },
      { status: 500 }
    );
  }
}
