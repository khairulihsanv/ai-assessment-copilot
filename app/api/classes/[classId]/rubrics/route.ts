import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { createRubricSchema } from "@/lib/validators/rubric";
import { generateEmbedding } from "@/lib/ai/embedding-client";

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
  const enrollment = cls.enrollments.find(e => e.userId === session.user.id);
  const isAssistant = enrollment?.role === "ASSISTANT";
  const isPrivileged = isDosen || isAssistant;

  if (!isPrivileged && !enrollment) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const rubrics = await prisma.rubric.findMany({
    where: { classId },
    include: {
      criteria: isPrivileged ? true : {
        select: {
          id: true,
          label: true,
          description: true,
          maxScore: true,
          weight: true,
          expectedAnswer: true,
          rubricId: true,
        }
      },
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

    // Generate embeddings for answer keys and materials
    const criteriaWithEmbeddings = await Promise.all(
      criteria.map(async (c) => {
        let answerKeyEmbedding: number[] | undefined = undefined;
        let materialEmbedding: number[] | undefined = undefined;

        // Generate embedding for answer key
        if (c.answerKey && c.answerKey.trim()) {
          try {
            const result = await generateEmbedding(c.answerKey);
            answerKeyEmbedding = result.embedding;
          } catch (err) {
            console.warn("[Rubric API] Gagal embed kunci jawaban:", err instanceof Error ? err.message : err);
          }
        }

        // Generate embedding for material
        if (c.material && c.material.trim()) {
          try {
            const result = await generateEmbedding(c.material);
            materialEmbedding = result.embedding;
          } catch (err) {
            console.warn("[Rubric API] Gagal embed materi:", err instanceof Error ? err.message : err);
          }
        }

        return {
          label: c.label,
          description: c.description || null,
          expectedAnswer: c.expectedAnswer || null,
          answerKey: c.answerKey || null,
          material: c.material || null,
          answerKeyEmbedding: answerKeyEmbedding ?? undefined,
          materialEmbedding: materialEmbedding ?? undefined,
          maxScore: c.maxScore,
          weight: c.weight,
        };
      })
    );

    const rubric = await prisma.rubric.create({
      data: {
        title,
        classId,
        createdById: session.user.id,
        criteria: {
          create: criteriaWithEmbeddings,
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
