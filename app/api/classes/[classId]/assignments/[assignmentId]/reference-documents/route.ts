import { after, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { getStorage } from "@/lib/storage/storage";
import crypto from "crypto";
import { processDocumentVersion } from "@/lib/parsers/document-parser";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ classId: string; assignmentId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { classId, assignmentId } = await params;

  // Permissions
  const cls = await prisma.class.findUnique({
    where: { id: classId },
    include: { enrollments: { where: { userId: session.user.id } } },
  });

  if (!cls) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isDosen = cls.dosenId === session.user.id;
  const isAssistant = cls.enrollments[0]?.role === "ASSISTANT";
  const isPrivileged = isDosen || isAssistant;

  if (!isPrivileged) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const assignment = await prisma.assignment.findFirst({
    where: { id: assignmentId, classId },
    select: { id: true },
  });
  if (!assignment) {
    return NextResponse.json({ error: "Tugas tidak ditemukan" }, { status: 404 });
  }

  // Parse form
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const sourceTypeStr = formData.get("sourceType") as string;
  
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
  }
  
  const sourceType = sourceTypeStr === "ANSWER_KEY" ? "ANSWER_KEY" : "MATERIAL";
  const buffer = Buffer.from(await file.arrayBuffer());
  const size = buffer.length;
  
  // Calculate checksum
  const hash = crypto.createHash("sha256");
  hash.update(buffer);
  const checksum = hash.digest("hex");

  // Save to storage
  const storage = getStorage();
  const objectKey = await storage.save(file.name, buffer);

  // DB Operations
  // Find or create document logical entity
  let document = await prisma.document.findFirst({
    where: { assignmentId, sourceType },
  });

  if (!document) {
    document = await prisma.document.create({
      data: {
        assignmentId,
        sourceType,
        ownerId: session.user.id,
      },
    });
  }

  // Next version number
  const latestVersion = await prisma.documentVersion.findFirst({
    where: { documentId: document.id },
    orderBy: { versionNumber: "desc" },
  });
  
  const nextVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;

  const version = await prisma.documentVersion.create({
    data: {
      documentId: document.id,
      versionNumber: nextVersionNumber,
      objectKey,
      mimeType: file.type || "application/octet-stream",
      checksum,
      size,
      extractionStatus: "UPLOADED",
    },
  });

  // Triggers async extraction here
  after(() => processDocumentVersion(version.id));

  return NextResponse.json({
    success: true,
    documentId: document.id,
    versionId: version.id,
    versionNumber: version.versionNumber,
    status: version.extractionStatus,
  }, { status: 202 });
}
