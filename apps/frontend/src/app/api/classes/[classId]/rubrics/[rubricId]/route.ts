import { NextResponse } from "next/server";
import { auth } from "@/server/auth/auth";
import { forwardToBackend, signInternalToken } from "@/server/auth/internal";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

// GET /api/classes/[classId]/rubrics/[rubricId]
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ classId: string; rubricId: string }> },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { classId, rubricId } = await params;
  const token = signInternalToken({ id: session.user.id, role: session.user.role });

  const res = await forwardToBackend(`${BACKEND_URL}/classes/${classId}/rubrics/${rubricId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await res.json();
  if (!res.ok)
    return NextResponse.json(
      { error: data.error || "Failed to fetch rubric" },
      { status: res.status },
    );
  return NextResponse.json(data);
}

// DELETE /api/classes/[classId]/rubrics/[rubricId]
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ classId: string; rubricId: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "DOSEN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { classId, rubricId } = await params;
  const token = signInternalToken({ id: session.user.id, role: session.user.role });

  const res = await forwardToBackend(`${BACKEND_URL}/classes/${classId}/rubrics/${rubricId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await res.json();
  if (!res.ok)
    return NextResponse.json(
      { error: data.error || "Failed to delete rubric" },
      { status: res.status },
    );
  return NextResponse.json(data);
}

// PUT /api/classes/[classId]/rubrics/[rubricId]
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ classId: string; rubricId: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "DOSEN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { classId, rubricId } = await params;
  const token = signInternalToken({ id: session.user.id, role: session.user.role });
  const body = await request.text();

  const res = await forwardToBackend(`${BACKEND_URL}/classes/${classId}/rubrics/${rubricId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body,
  });

  const data = await res.json();
  if (!res.ok)
    return NextResponse.json(
      { error: data.error || "Failed to update rubric" },
      { status: res.status },
    );
  return NextResponse.json(data);
}
