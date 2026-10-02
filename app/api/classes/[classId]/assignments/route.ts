import { publicCriterionSelect, publicGradeSelect, withReleasedGrade } from "@/lib/db/public-selects";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { createAssignmentSchema } from "@/lib/validators/assignment";

// GET /api/classes/[classId]/assignments
export async function GET(
  request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { classId } = await params;

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

  const assignments = await prisma.assignment.findMany({
    where: { classId, ...(isPrivileged ? {} : { status: { not: "DRAFT" } }) },
    include: {
      rubric: {
        include: {
          criteria: isPrivileged ? true : { select: publicCriterionSelect }
        },
      },
      submissions: {
        where: isPrivileged ? undefined : { userId: session.user.id },
        include: {
          grades: isPrivileged ? true : { where: { status: "RELEASED" }, select: publicGradeSelect },
          versions: true,
        },
      },
      _count: {
        select: { submissions: true },
      },
    },
    orderBy: { dueDate: "asc" },
  });

  return NextResponse.json(isPrivileged ? assignments : assignments.map((assignment) => ({
    ...assignment, submissions: assignment.submissions.map(withReleasedGrade),
  })));
}

// POST /api/classes/[classId]/assignments
export async function POST(
  request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "DOSEN") {
    return NextResponse.json(
      { error: "Hanya dosen yang dapat membuat tugas" },
      { status: 403 }
    );
  }

  const { classId } = await params;

  const cls = await prisma.class.findUnique({
    where: { id: classId },
  });

  if (!cls || cls.dosenId !== session.user.id) {
    return NextResponse.json(
      { error: "Kelas tidak ditemukan atau Anda bukan pengajar di kelas ini" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const parsed = createAssignmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Data tugas tidak valid" },
        { status: 400 }
      );
    }

    const {
      title,
      instructions,
      submissionType,
      dueDate,
      maxScore,
      allowLateSubmission,
      rubricId,
      status,
    } = parsed.data;

    // If rubricId provided, verify it belongs to this class
    if (rubricId) {
      const rubric = await prisma.rubric.findFirst({
        where: { id: rubricId, classId },
      });
      if (!rubric) {
        return NextResponse.json(
          { error: "Rubrik yang dipilih tidak ditemukan di kelas ini" },
          { status: 400 }
        );
      }
    }

    const assignment = await prisma.assignment.create({
      data: {
        classId,
        title,
        instructions,
        submissionType,
        dueDate: new Date(dueDate),
        maxScore,
        allowLateSubmission,
        rubricId: rubricId || null,
        status: status || "PUBLISHED",
      },
      include: {
        rubric: {
          include: { criteria: true },
        },
      },
    });

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    console.error("Create assignment error:", error);
    return NextResponse.json(
      { error: "Gagal membuat penugasan" },
      { status: 500 }
    );
  }
}
