import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { getStorage } from "@/lib/storage/storage";
import { MAX_FILE_SIZE } from "@/lib/utils";

// GET /api/classes/[classId]/assignments/[assignmentId]/submissions
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
    include: { class: true },
  });

  if (!assignment) {
    return NextResponse.json({ error: "Tugas tidak ditemukan" }, { status: 404 });
  }

  const isDosen = assignment.class.dosenId === session.user.id;

  const submissions = await prisma.submission.findMany({
    where: {
      assignmentId,
      ...(isDosen ? {} : { mahasiswaId: session.user.id }),
    },
    include: {
      mahasiswa: {
        select: { id: true, name: true, email: true },
      },
      grade: true,
      aiEvaluation: isDosen ? true : false, // Hide raw AI evaluation from student
    },
    orderBy: { submittedAt: "desc" },
  });

  return NextResponse.json(submissions);
}

// POST /api/classes/[classId]/assignments/[assignmentId]/submissions — Mahasiswa submits work
export async function POST(
  request: Request,
  { params }: { params: Promise<{ classId: string; assignmentId: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "MAHASISWA") {
    return NextResponse.json(
      { error: "Hanya mahasiswa yang dapat mengumpulkan tugas" },
      { status: 403 }
    );
  }

  const { classId, assignmentId } = await params;

  // Check enrollment
  const enrollment = await prisma.enrollment.findUnique({
    where: {
      classId_mahasiswaId: {
        classId,
        mahasiswaId: session.user.id,
      },
    },
  });

  if (!enrollment) {
    return NextResponse.json(
      { error: "Anda belum terdaftar di kelas ini" },
      { status: 403 }
    );
  }

  const assignment = await prisma.assignment.findFirst({
    where: { id: assignmentId, classId },
  });

  if (!assignment) {
    return NextResponse.json({ error: "Tugas tidak ditemukan" }, { status: 404 });
  }

  // Check deadline
  const now = new Date();
  if (now > assignment.dueDate && !assignment.allowLateSubmission) {
    return NextResponse.json(
      { error: "Tenggat waktu pengumpulan tugas ini telah berakhir" },
      { status: 400 }
    );
  }

  const contentType = request.headers.get("content-type") || "";

  try {
    let submissionType: "TEXT" | "PDF" | "DOCX";
    let content: string | null = null;
    let fileUrl: string | null = null;
    let fileName: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const text = formData.get("content") as string | null;

      if (file && file.size > 0) {
        if (file.size > MAX_FILE_SIZE) {
          return NextResponse.json(
            { error: "Ukuran file melebihi batas maksimum 10MB" },
            { status: 400 }
          );
        }

        const originalName = file.name.toLowerCase();
        if (originalName.endsWith(".pdf")) {
          submissionType = "PDF";
        } else if (originalName.endsWith(".docx")) {
          submissionType = "DOCX";
        } else {
          return NextResponse.json(
            { error: "Format file tidak didukung. Harap unggah file .pdf atau .docx" },
            { status: 400 }
          );
        }

        // Validate assignment allows this type
        if (
          assignment.submissionType !== "ANY" &&
          assignment.submissionType !== submissionType
        ) {
          return NextResponse.json(
            { error: `Tugas ini hanya menerima format ${assignment.submissionType}` },
            { status: 400 }
          );
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const storage = getStorage();
        const savedFileName = await storage.save(file.name, buffer);

        fileUrl = savedFileName;
        fileName = file.name;
      } else if (text && text.trim()) {
        if (
          assignment.submissionType !== "ANY" &&
          assignment.submissionType !== "TEXT"
        ) {
          return NextResponse.json(
            { error: `Tugas ini hanya menerima format ${assignment.submissionType}` },
            { status: 400 }
          );
        }
        submissionType = "TEXT";
        content = text.trim();
      } else {
        return NextResponse.json(
          { error: "File atau teks jawaban tidak boleh kosong" },
          { status: 400 }
        );
      }
    } else {
      // JSON body for text submission
      const body = await request.json();
      if (!body.content || !body.content.trim()) {
        return NextResponse.json(
          { error: "Teks jawaban tidak boleh kosong" },
          { status: 400 }
        );
      }
      submissionType = "TEXT";
      content = body.content.trim();
    }

    // Upsert submission
    const submission = await prisma.submission.upsert({
      where: {
        assignmentId_mahasiswaId: {
          assignmentId,
          mahasiswaId: session.user.id,
        },
      },
      update: {
        type: submissionType,
        content,
        fileUrl,
        fileName,
        submittedAt: now,
        status: "SUBMITTED",
      },
      create: {
        assignmentId,
        mahasiswaId: session.user.id,
        type: submissionType,
        content,
        fileUrl,
        fileName,
        submittedAt: now,
        status: "SUBMITTED",
      },
    });

    return NextResponse.json(submission, { status: 201 });
  } catch (error) {
    console.error("Submission upload error:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan pengumpulan tugas" },
      { status: 500 }
    );
  }
}
