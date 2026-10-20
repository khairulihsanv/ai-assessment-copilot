import { NextResponse } from "next/server";
import { auth } from "@/server/auth/auth";
import { forwardToBackend, signInternalToken } from "@/server/auth/internal";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ classId: string; assignmentId: string }> },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { classId, assignmentId } = await params;
  const token = signInternalToken({ id: session.user.id, role: session.user.role });
  const contentType = request.headers.get("content-type") || "";
  const body = await request.arrayBuffer();

  const res = await forwardToBackend(
    `${BACKEND_URL}/classes/${classId}/assignments/${assignmentId}/reference-documents`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": contentType,
      },
      body,
      // @ts-expect-error
      duplex: "half",
    },
  );

  const data = await res.json();
  if (!res.ok) return NextResponse.json(data, { status: res.status });
  return NextResponse.json(data, { status: 202 });
}
