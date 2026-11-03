import { NextResponse } from "next/server";
import { auth } from "@/server/auth/auth";
import { forwardToBackend, signInternalToken } from "@/server/auth/internal";

const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:3001";

// GET /api/submissions/[submissionId]/file — download the original submitted document.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ submissionId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { submissionId } = await params;
  const versionId = new URL(request.url).searchParams.get("versionId");
  const query = versionId ? `?versionId=${encodeURIComponent(versionId)}` : "";
  const token = signInternalToken({ id: session.user.id, role: session.user.role });

  const res = await forwardToBackend(`${BACKEND_URL}/submissions/${submissionId}/file${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    return NextResponse.json({ error: "Berkas tidak ditemukan" }, { status: res.status });
  }

  return new Response(await res.arrayBuffer(), {
    status: 200,
    headers: {
      "Content-Type": res.headers.get("content-type") || "application/octet-stream",
      "Content-Disposition": res.headers.get("content-disposition") || "attachment",
      "Cache-Control": "private, no-store",
    },
  });
}
