import { NextResponse } from "next/server";
import { auth } from "@/server/auth/auth";
import { forwardToBackend, signInternalToken } from "@/server/auth/internal";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

// GET /api/classes/[classId]/rubrics
export async function GET(_request: Request, { params }: { params: Promise<{ classId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { classId } = await params;
  const token = signInternalToken({ id: session.user.id, role: session.user.role });

  const res = await forwardToBackend(`${BACKEND_URL}/classes/${classId}/rubrics`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const data = await res.json();
  if (!res.ok) return NextResponse.json({ error: data.error || "Failed to fetch rubrics" }, { status: res.status });
  return NextResponse.json(data);
}

// POST /api/classes/[classId]/rubrics
export async function POST(request: Request, { params }: { params: Promise<{ classId: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "DOSEN") {
    return NextResponse.json(
      { error: "Hanya dosen yang dapat membuat rubrik penilaian" },
      { status: 403 },
    );
  }

  const { classId } = await params;
  const token = signInternalToken({ id: session.user.id, role: session.user.role });
  const body = await request.text();

  const res = await forwardToBackend(`${BACKEND_URL}/classes/${classId}/rubrics`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body
  });

  const data = await res.json();
  if (!res.ok) return NextResponse.json({ error: data.error || "Gagal menyimpan rubrik penilaian" }, { status: res.status });
  return NextResponse.json(data, { status: 201 });
}
