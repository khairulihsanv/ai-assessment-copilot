import { NextResponse } from "next/server";
import { auth } from "@/server/auth/auth";
import { forwardToBackend, signInternalToken } from "@/server/auth/internal";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

// POST /api/submissions/[submissionId]/grade — Trigger AI grading
export async function POST(
  request: Request,
  { params }: { params: Promise<{ submissionId: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "DOSEN") {
    return NextResponse.json(
      { error: "Hanya dosen yang dapat memicu penilaian AI" },
      { status: 403 },
    );
  }

  const { submissionId } = await params;
  const token = signInternalToken({ id: session.user.id, role: session.user.role });

  const res = await forwardToBackend(`${BACKEND_URL}/submissions/${submissionId}/grade`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await res.json();
  if (!res.ok) return NextResponse.json(data, { status: res.status });
  return NextResponse.json(data);
}
