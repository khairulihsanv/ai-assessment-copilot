import { NextResponse } from "next/server";
import { auth } from "@/server/auth/auth";
import { forwardToBackend, signInternalToken } from "@/server/auth/internal";

const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:3001";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ submissionId: string; pageNumber: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { submissionId, pageNumber } = await params;
  const token = signInternalToken({ id: session.user.id, role: session.user.role });

  const res = await forwardToBackend(
    `${BACKEND_URL}/submissions/${submissionId}/pages/${pageNumber}/image`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (!res.ok) {
    return NextResponse.json({ error: "Gambar halaman tidak ditemukan" }, { status: res.status });
  }

  const contentType = res.headers.get("content-type") || "image/jpeg";
  const buffer = await res.arrayBuffer();

  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
