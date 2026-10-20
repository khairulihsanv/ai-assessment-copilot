import { NextResponse } from "next/server";
import { auth } from "@/server/auth/auth";
import { forwardToBackend, signInternalToken } from "@/server/auth/internal";

const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:3001";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ classId: string; assignmentId: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "MAHASISWA") {
    return NextResponse.json(
      { error: "Hanya mahasiswa yang dapat melakukan scan tugas" },
      { status: 403 },
    );
  }

  const { classId, assignmentId } = await params;
  const token = signInternalToken({ id: session.user.id, role: session.user.role });

  const contentType = request.headers.get("content-type") || "";
  const body = await request.arrayBuffer();

  const res = await forwardToBackend(
    `${BACKEND_URL}/classes/${classId}/assignments/${assignmentId}/submissions/ocr-scan`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": contentType,
      },
      body,
      duplex: "half",
    } as RequestInit & { duplex?: string },
  );

  const data = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) {
    return NextResponse.json(
      { error: data.error || data.detail || "Gagal memproses pemindaian OCR" },
      { status: res.status },
    );
  }

  return NextResponse.json(data);
}
