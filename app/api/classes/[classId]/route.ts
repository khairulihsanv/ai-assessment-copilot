import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { updateClassSchema } from "@/lib/validators/class";

// GET /api/classes/[classId]
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { classId } = await params;

  // 1. Get class baseline to check authorization
  const baseCls = await prisma.class.findUnique({
    where: { id: classId },
    select: { dosenId: true },
  });

  if (!baseCls) {
    return NextResponse.json({ error: "Kelas tidak ditemukan" }, { status: 404 });
  }

  const isDosen = session.user.role === "DOSEN" && baseCls.dosenId === session.user.id;
  const enrollment = await prisma.enrollment.findUnique({
    where: { classId_userId: { classId, userId: session.user.id } }
  });
  
  const isAssistant = enrollment?.role === "ASSISTANT";
  const isPrivileged = isDosen || isAssistant;

  if (!isPrivileged && !enrollment) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  // 2. Fetch full data with conditional select
  const cls = await prisma.class.findUnique({
    where: { id: classId },
    select: {
      id: true,
      name: true,
      description: true,
      subject: true,
      enrollmentKey: isPrivileged,
      isArchived: true,
      createdAt: true,
      dosenId: true,
      dosen: { select: { id: true, name: true, email: true } },
      enrollments: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      assignments: { orderBy: { createdAt: "desc" } },
      rubrics: { 
        select: {
          id: true,
          title: true,
          createdAt: true,
          classId: true,
          createdById: true,
          criteria: {
            select: {
              id: true,
              label: true,
              description: true,
              maxScore: true,
              weight: true,
              expectedAnswer: true,
              rubricId: true,
              answerKey: isPrivileged,
              material: isPrivileged,
              answerKeyEmbedding: isPrivileged,
              materialEmbedding: isPrivileged,
            }
          }
        } 
      },
      _count: { select: { enrollments: true, assignments: true } },
    }
  });

  return NextResponse.json(cls);
}

// PATCH /api/classes/[classId]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "DOSEN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { classId } = await params;

  const cls = await prisma.class.findUnique({ where: { id: classId } });
  if (!cls || cls.dosenId !== session.user.id) {
    return NextResponse.json({ error: "Kelas tidak ditemukan" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = updateClassSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data tidak valid" },
      { status: 400 }
    );
  }

  const updated = await prisma.class.update({
    where: { id: classId },
    data: parsed.data,
  });

  return NextResponse.json(updated);
}

// DELETE /api/classes/[classId]
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "DOSEN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { classId } = await params;

  const cls = await prisma.class.findUnique({ where: { id: classId } });
  if (!cls || cls.dosenId !== session.user.id) {
    return NextResponse.json({ error: "Kelas tidak ditemukan" }, { status: 404 });
  }

  await prisma.class.delete({ where: { id: classId } });

  return NextResponse.json({ success: true });
}
