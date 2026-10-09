import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { createClassSchema } from "@/lib/validators/class";
import { generateEnrollmentKey } from "@/lib/utils";

// GET /api/classes — List classes
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isDosen = session.user.role === "DOSEN";

  const classes = isDosen
    ? await prisma.class.findMany({
        where: { dosenId: session.user.id },
        include: {
          _count: { select: { enrollments: true, assignments: true } },
          dosen: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      })
    : await prisma.class.findMany({
        where: { enrollments: { some: { userId: session.user.id } } },
        include: {
          _count: { select: { enrollments: true, assignments: true } },
          dosen: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      });

  return NextResponse.json(classes);
}

// POST /api/classes — Create class (dosen only)
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "DOSEN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createClassSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data tidak valid" },
      { status: 400 }
    );
  }

  const enrollmentKey = generateEnrollmentKey();

  const newClass = await prisma.class.create({
    data: {
      ...parsed.data,
      dosenId: session.user.id,
      enrollmentKey,
    },
  });

  return NextResponse.json(newClass, { status: 201 });
}
