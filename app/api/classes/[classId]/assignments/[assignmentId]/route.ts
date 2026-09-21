import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { updateAssignmentSchema } from "@/lib/validators/assignment";

// GET /api/classes/[classId]/assignments/[assignmentId]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ classId: string; assignmentId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { classId, assignmentId } = await params;

  const assignment = await prisma.assignment.findFirst({
    where: { id: assignmentId, classId },
    include: {
      rubric: {
        include: { criteria: true },
      },
      class: {
        select: {
          id: true,
          name: true,
          dosenId: true,
          enrollments: {
            select: { mahasiswaId: true },
          },
        },
      },
      submissions: {
        include: {
          mahasiswa: {
            select: { id: true, name: true, email: true },
          },
          grade: true,
          aiEvaluation: true,
        },
        orderBy: { submittedAt: "desc" },
      },
    },
  });

  if (!assignment) {
    return NextResponse.json({ error: "Tugas tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json(assignment);
}

// DELETE /api/classes/[classId]/assignments/[assignmentId]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ classId: string; assignmentId: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "DOSEN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { classId, assignmentId } = await params;

  const cls = await prisma.class.findUnique({
    where: { id: classId },
  });

  if (!cls || cls.dosenId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.assignment.delete({
    where: { id: assignmentId },
  });

  return NextResponse.json({ success: true, message: "Tugas berhasil dihapus" });
}

// PATCH /api/classes/[classId]/assignments/[assignmentId]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ classId: string; assignmentId: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "DOSEN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { classId, assignmentId } = await params;

  const cls = await prisma.class.findUnique({
    where: { id: classId },
  });

  if (!cls || cls.dosenId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = updateAssignmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Data tidak valid" },
        { status: 400 }
      );
    }

    const dataToUpdate: Record<string, unknown> = { ...parsed.data };
    if (dataToUpdate.dueDate) {
      dataToUpdate.dueDate = new Date(dataToUpdate.dueDate as string);
    }

    const updated = await prisma.assignment.update({
      where: { id: assignmentId },
      data: dataToUpdate,
      include: {
        rubric: {
          include: { criteria: true },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update assignment error:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui data tugas" },
      { status: 500 }
    );
  }
}
