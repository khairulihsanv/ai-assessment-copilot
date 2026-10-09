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

  const version = await prisma.referenceSetVersion.findUnique({
    where: { id },
    include: { assignment: true, documents: { include: { documentVersion: true } } }
  });

  if (!version) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const cls = await prisma.class.findUnique({
    where: { id: version.assignment.classId }
  });

  if (!cls || cls.dosenId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (version.documents.length === 0) {
    return NextResponse.json({ error: "Set acuan harus memiliki dokumen" }, { status: 400 });
  }

  // Check if all underlying documents are READY
  const notReadyDocs = version.documents.filter(
    d => d.documentVersion.extractionStatus !== "READY"
  );

  if (notReadyDocs.length > 0) {
    return NextResponse.json({ 
      error: "Cannot approve Reference Set because some documents are not READY",
      notReadyDocs: notReadyDocs.map(d => ({
        id: d.documentVersion.id,
        status: d.documentVersion.extractionStatus
      }))
    }, { status: 400 });
  }

  const updated = await prisma.referenceSetVersion.update({
    where: { id },
    data: {
      approvedById: session.user.id,
      approvedAt: new Date(),
    }
  });

  return NextResponse.json({ success: true, referenceSet: updated });
}
