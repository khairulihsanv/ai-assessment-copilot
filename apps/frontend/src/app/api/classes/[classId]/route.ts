import { NextResponse } from "next/server";
import { auth } from "@/server/auth/auth";
import { forwardToBackend, signInternalToken } from "@/server/auth/internal";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

// GET /api/classes/[classId]
export async function GET(_request: Request, { params }: { params: Promise<{ classId: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { classId } = await params;
  const token = signInternalToken({ id: session.user.id, role: session.user.role });
  
  const res = await forwardToBackend(`${BACKEND_URL}/classes/${classId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const data = await res.json();
  if (!res.ok) return NextResponse.json({ error: data.error || "Failed to fetch class" }, { status: res.status });
  return NextResponse.json(data);
}

// PATCH /api/classes/[classId]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ classId: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "DOSEN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { classId } = await params;
  const token = signInternalToken({ id: session.user.id, role: session.user.role });
  const body = await request.text();

  const res = await forwardToBackend(`${BACKEND_URL}/classes/${classId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body
  });

  const data = await res.json();
  if (!res.ok) return NextResponse.json({ error: data.error || "Failed to update class" }, { status: res.status });
  return NextResponse.json(data);
}

// DELETE /api/classes/[classId]
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ classId: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "DOSEN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { classId } = await params;
  const token = signInternalToken({ id: session.user.id, role: session.user.role });

  const res = await forwardToBackend(`${BACKEND_URL}/classes/${classId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });

  const data = await res.json();
  if (!res.ok) return NextResponse.json({ error: data.error || "Failed to delete class" }, { status: res.status });
  return NextResponse.json(data);
}
