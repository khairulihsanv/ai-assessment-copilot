import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { joinClassSchema } from "@/lib/validators/class";

// POST /api/classes/join — Mahasiswa joins class with enrollment key
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "MAHASISWA") {
    return NextResponse.json(
      { error: "Hanya mahasiswa yang dapat bergabung ke kelas" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const parsed = joinClassSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Kode kelas tidak valid" },
        { status: 400 }
      );
    }

    const enrollmentKey = parsed.data.enrollmentKey.trim().toUpperCase();

    // Find class
    const cls = await prisma.class.findUnique({
      where: { enrollmentKey },
    });

    if (!cls) {
      return NextResponse.json(
        { error: "Kode kelas tidak ditemukan. Pastikan kode yang Anda masukkan benar." },
        { status: 404 }
      );
    }

    if (cls.isArchived) {
      return NextResponse.json(
        { error: "Kelas ini sudah diarsipkan oleh dosen pengajar." },
        { status: 400 }
      );
    }

    // Check existing enrollment
    const existing = await prisma.enrollment.findUnique({
      where: {
        classId_mahasiswaId: {
          classId: cls.id,
          mahasiswaId: session.user.id,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Anda sudah terdaftar di kelas ini." },
        { status: 400 }
      );
    }

    // Create enrollment
    await prisma.enrollment.create({
      data: {
        classId: cls.id,
        mahasiswaId: session.user.id,
      },
    });

    return NextResponse.json(
      { success: true, classId: cls.id, className: cls.name },
      { status: 201 }
    );
  } catch (error) {
    console.error("Join class error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server saat bergabung kelas" },
      { status: 500 }
    );
  }
}
