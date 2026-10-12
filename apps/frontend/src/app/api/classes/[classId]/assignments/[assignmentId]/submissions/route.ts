import { NextResponse } from "next/server";
import { auth } from "@/server/auth/auth";
import { forwardToBackend, signInternalToken } from "@/server/auth/internal";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

// GET /api/classes/[classId]/assignments/[assignmentId]/submissions
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ classId: string; assignmentId: string }> },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { classId, assignmentId } = await params;
  const token = signInternalToken({ id: session.user.id, role: session.user.role });

  const res = await forwardToBackend(`${BACKEND_URL}/classes/${classId}/assignments/${assignmentId}/submissions`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const data = await res.json();
  if (!res.ok) return NextResponse.json({ error: data.error || "Failed to fetch submissions" }, { status: res.status });
  return NextResponse.json(data);
}

// POST /api/classes/[classId]/assignments/[assignmentId]/submissions
export async function POST(
  request: Request,
  { params }: { params: Promise<{ classId: string; assignmentId: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "MAHASISWA") {
    return NextResponse.json(
      { error: "Hanya mahasiswa yang dapat mengumpulkan tugas" },
      { status: 403 },
    );
  }

  const { classId, assignmentId } = await params;
  const token = signInternalToken({ id: session.user.id, role: session.user.role });
  
  // Forward everything: body, content-type
  const contentType = request.headers.get("content-type") || "";
  const body = await request.arrayBuffer();

  const res = await forwardToBackend(`${BACKEND_URL}/classes/${classId}/assignments/${assignmentId}/submissions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": contentType
    },
    body,
    // @ts-ignore
    duplex: "half"
  });

  const data = await res.json();
  if (!res.ok) return NextResponse.json({ error: data.error || "Gagal menyimpan pengumpulan tugas" }, { status: res.status });
  return NextResponse.json(data, { status: 201 });
}
