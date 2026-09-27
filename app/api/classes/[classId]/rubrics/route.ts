import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { createRubricSchema } from "@/lib/validators/rubric";

// GET /api/classes/[classId]/rubrics
export async function GET(
  request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { classId } = await params;

  // Check enrollment or ownership
  const cls = await prisma.class.findUnique({
    where: { id: classId },
    include: { enrollments: true },
  });

  if (!cls) {
    return NextResponse.json({ error: "Kelas tidak ditemukan" }, { status: 404 });
  }

  const isDosen = cls.dosenId === session.user.id;
  const isEnrolled = cls.enrollments.some((e) => e.mahasiswaId === session.user.id);

  if (!isDosen && !isEnrolled) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const rubrics = await prisma.rubric.findMany({
    where: { classId },
    include: {
      criteria: true,
      _count: { select: { assignments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(rubrics);
}

// POST /api/classes/[classId]/rubrics
export async function POST(
  request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "DOSEN") {
    return NextResponse.json(
      { error: "Hanya dosen yang dapat membuat rubrik penilaian" },
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
    const parsed = createRubricSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Data rubrik tidak valid" },
        { status: 400 }
      );
    }

    const { title, criteria } = parsed.data;

    const rubric = await prisma.rubric.create({
      data: {
        title,
        classId,
        createdById: session.user.id,
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
      include: {
        criteria: true,
      },
    });

    return NextResponse.json(rubric, { status: 201 });
  } catch (error) {
    console.error("Create rubric error:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan rubrik penilaian" },
      { status: 500 }
    );
  }
}
