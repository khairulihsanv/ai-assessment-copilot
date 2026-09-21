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

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      dosen: { select: { id: true, name: true, email: true } },
      enrollments: {
        include: { mahasiswa: { select: { id: true, name: true, email: true } } },
      },
      assignments: { orderBy: { createdAt: "desc" } },
      rubrics: { include: { criteria: true } },
      _count: { select: { enrollments: true, assignments: true } },
    },
  });

  if (!cls) {
    return NextResponse.json({ error: "Kelas tidak ditemukan" }, { status: 404 });
  }

  // Check access
  const isDosen = session.user.role === "DOSEN" && cls.dosenId === session.user.id;
  const isEnrolled = cls.enrollments.some((e) => e.mahasiswaId === session.user.id);

  if (!isDosen && !isEnrolled) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  // Hide enrollment key from students
  if (!isDosen) {
    return NextResponse.json({ ...cls, enrollmentKey: undefined });
  }

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
