import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "DOSEN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const version = await prisma.documentVersion.findUnique({
    where: { id },
    include: { document: { include: { assignment: true } } }
  });

  if (!version) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const cls = await prisma.class.findUnique({
    where: { id: version.document.assignment.classId }
  });

  if (!cls || cls.dosenId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (version.extractionStatus !== "REVIEW_REQUIRED") {
    return NextResponse.json({ 
      error: `Cannot approve document in status: ${version.extractionStatus}` 
    }, { status: 400 });
  }

  const updated = await prisma.documentVersion.updateMany({
    where: { id, extractionStatus: "REVIEW_REQUIRED" },
    data: {
      extractionStatus: "APPROVED",
      approvedById: session.user.id,
      approvedAt: new Date(),
    }
  });

  if (updated.count !== 1) {
    return NextResponse.json({ error: "Status dokumen telah berubah. Muat ulang." }, { status: 409 });
  }
  // READY is reserved for a completed, validated indexing job.
  return NextResponse.json({ success: true, status: "APPROVED", indexingPending: true });
}
