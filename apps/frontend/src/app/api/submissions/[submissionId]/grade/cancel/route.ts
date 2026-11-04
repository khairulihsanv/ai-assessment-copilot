import { NextResponse } from "next/server";
import { auth } from "@/server/auth/auth";
import { forwardToBackend, signInternalToken } from "@/server/auth/internal";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

// POST /api/submissions/[submissionId]/grade/cancel — Stop a running draft
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ submissionId: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "DOSEN") {
    return NextResponse.json({ error: "Hanya dosen yang dapat membatalkan draf" }, { status: 403 });
  }

  const { submissionId } = await params;
  const token = signInternalToken({ id: session.user.id, role: session.user.role });
  const res = await forwardToBackend(`${BACKEND_URL}/submissions/${submissionId}/grade/cancel`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  return NextResponse.json(await res.json(), { status: res.status });
}
