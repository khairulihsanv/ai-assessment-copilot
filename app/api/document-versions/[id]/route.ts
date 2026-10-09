import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const version = await prisma.documentVersion.findUnique({
    where: { id },
    include: {
      document: {
        include: {
          assignment: {
            include: { class: { include: { enrollments: true } } }
          }
        }
      },
      chunks: true,
    }
  });

  if (!version) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const cls = version.document.assignment.class;
  const isDosen = cls.dosenId === session.user.id;
  const enrollment = cls.enrollments.find((e) => e.userId === session.user.id);
  const isAssistant = enrollment?.role === "ASSISTANT";

  if (!isDosen && !isAssistant) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    id: version.id,
    versionNumber: version.versionNumber,
    mimeType: version.mimeType,
    extractionStatus: version.extractionStatus,
    errorMessage: version.errorMessage,
    chunks: version.chunks,
  });
}
