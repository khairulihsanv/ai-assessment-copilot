import { NextResponse } from "next/server";
import { auth } from "@/server/auth/auth";
import { forwardToBackend, signInternalToken } from "@/server/auth/internal";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

// POST /api/classes/[classId]/regenerate-key
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ classId: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "DOSEN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { classId } = await params;
  const token = signInternalToken({ id: session.user.id, role: session.user.role });

  const res = await forwardToBackend(`${BACKEND_URL}/classes/${classId}/regenerate-key`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await res.json();
  if (!res.ok)
    return NextResponse.json(
      { error: data.error || "Failed to regenerate key" },
      { status: res.status },
    );
  // Ensure we match the previous response format: { enrollmentKey: ... } or what the backend returns: { success: true, newKey: ... }
  return NextResponse.json({ enrollmentKey: data.newKey || data.enrollmentKey });
}
