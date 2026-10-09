import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ classId: string; assignmentId: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "DOSEN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { classId, assignmentId } = await params;

  const cls = await prisma.class.findUnique({
    where: { id: classId }
  });

  if (!cls || cls.dosenId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const assignment = await prisma.assignment.findFirst({ where: { id: assignmentId, classId }, select: { id: true } });
  if (!assignment) return NextResponse.json({ error: "Tugas tidak ditemukan" }, { status: 404 });
  const body = await request.json().catch(() => null);
  if (!Array.isArray(body?.documentVersionIds) || !body.documentVersionIds.length ||
      body.documentVersionIds.length > 20 || body.documentVersionIds.some((id: unknown) => typeof id !== "string" || !id)) {
    return NextResponse.json({ error: "Pilih 1–20 versi dokumen yang valid" }, { status: 400 });
  }
  const documentVersionIds = [...new Set<string>(body.documentVersionIds)];
  const documents = await prisma.documentVersion.findMany({
    where: { id: { in: documentVersionIds }, document: { assignmentId } }, select: { id: true },
  });
  if (documents.length !== documentVersionIds.length) {
    return NextResponse.json({ error: "Dokumen harus berasal dari tugas ini" }, { status: 403 });
  }

  // Next version number
  const latestVersion = await prisma.referenceSetVersion.findFirst({
    where: { assignmentId },
    orderBy: { versionNumber: "desc" },
  });
  
  const nextVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;

  const referenceSet = await prisma.referenceSetVersion.create({
    data: {
      assignmentId,
      versionNumber: nextVersionNumber,
      documents: {
        create: documentVersionIds.map(id => ({
          documentVersionId: id
        }))
      }
    },
    include: { documents: true }
  });

  return NextResponse.json(referenceSet, { status: 201 });
}
