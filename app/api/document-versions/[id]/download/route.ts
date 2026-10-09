import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { getStorage } from "@/lib/storage/storage";

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
      }
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

  try {
    const storage = getStorage();
    const buffer = await storage.get(version.objectKey);

    return new Response(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": version.mimeType,
        "Content-Disposition": `attachment; filename="${version.objectKey}"`,
      },
    });
  } catch (error) {
    console.error("Storage error:", error);
    return NextResponse.json({ error: "Failed to read file from storage" }, { status: 500 });
  }
}
