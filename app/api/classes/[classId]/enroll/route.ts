import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { joinClassSchema } from "@/lib/validators/class";

// POST /api/classes/[classId]/enroll — Join a class
export async function POST(
  request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "MAHASISWA") {
    return NextResponse.json({ error: "Hanya mahasiswa yang bisa bergabung ke kelas" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = joinClassSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Kode kelas tidak valid" },
      { status: 400 }
    );
  }

  // Find class by enrollment key (ignore classId param, use the key)
  const cls = await prisma.class.findUnique({
    where: { enrollmentKey: parsed.data.enrollmentKey },
  });

  if (!cls) {
    return NextResponse.json({ error: "Kode kelas tidak ditemukan. Periksa kembali kode yang Anda masukkan." }, { status: 404 });
  }

  if (cls.isArchived) {
    return NextResponse.json({ error: "Kelas ini sudah diarsipkan." }, { status: 400 });
  }

  // Check if already enrolled
  const existing = await prisma.enrollment.findUnique({
    where: {
      classId_mahasiswaId: {
        classId: cls.id,
        mahasiswaId: session.user.id,
      },
    },
  });

  if (existing) {
    return NextResponse.json({ error: "Anda sudah terdaftar di kelas ini." }, { status: 400 });
  }

  await prisma.enrollment.create({
    data: {
      classId: cls.id,
      mahasiswaId: session.user.id,
    },
  });

  return NextResponse.json({ success: true, classId: cls.id, className: cls.name }, { status: 201 });
}
