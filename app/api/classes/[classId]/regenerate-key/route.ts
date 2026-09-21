import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { generateEnrollmentKey } from "@/lib/utils";

// POST /api/classes/[classId]/regenerate-key
export async function POST(
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

  const newKey = generateEnrollmentKey();

  const updated = await prisma.class.update({
    where: { id: classId },
    data: { enrollmentKey: newKey },
  });

  return NextResponse.json({ enrollmentKey: updated.enrollmentKey });
}
