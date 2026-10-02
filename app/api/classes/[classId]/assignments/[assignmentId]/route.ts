import { publicCriterionSelect, publicGradeSelect, withReleasedGrade } from "@/lib/db/public-selects";
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

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    include: { enrollments: { where: { userId: session.user.id } } }
  });

  if (!cls) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isDosen = cls.dosenId === session.user.id;
  const enrollment = cls.enrollments[0];
  const isAssistant = enrollment?.role === "ASSISTANT";
  const isPrivileged = isDosen || isAssistant;

  if (!isPrivileged && !enrollment) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const assignment = await prisma.assignment.findFirst({
    where: { id: assignmentId, classId, ...(isPrivileged ? {} : { status: { not: "DRAFT" } }) },
    include: {
      rubric: {
        include: {
          criteria: isPrivileged ? true : { select: publicCriterionSelect }
        },
      },
      class: {
        select: {
          id: true,
          name: true,
          dosenId: true,
        },
      },
      submissions: {
        where: isPrivileged ? undefined : { userId: session.user.id },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          grades: isPrivileged ? true : { where: { status: "RELEASED" }, select: publicGradeSelect },
          versions: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!assignment) {
    return NextResponse.json({ error: "Tugas tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json(isPrivileged ? assignment : {
    ...assignment, submissions: assignment.submissions.map(withReleasedGrade),
  });
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
    where: { id: assignmentId, classId },
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

    if (parsed.data.rubricId) {
      const rubric = await prisma.rubric.findFirst({ where: { id: parsed.data.rubricId, classId }, select: { id: true } });
      if (!rubric) return NextResponse.json({ error: "Rubrik tidak tersedia di kelas ini" }, { status: 400 });
    }
    const dataToUpdate: Record<string, unknown> = { ...parsed.data };
    if (dataToUpdate.dueDate) {
      dataToUpdate.dueDate = new Date(dataToUpdate.dueDate as string);
    }

    const updated = await prisma.assignment.update({
      where: { id: assignmentId, classId },
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
