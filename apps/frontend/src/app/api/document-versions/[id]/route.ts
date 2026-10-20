import { NextResponse } from "next/server";
import { auth } from "@/server/auth/auth";
import { forwardToBackend, signInternalToken } from "@/server/auth/internal";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const token = signInternalToken({ id: session.user.id, role: session.user.role });

  const res = await forwardToBackend(`${BACKEND_URL}/document-versions/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await res.json();
  if (!res.ok) return NextResponse.json(data, { status: res.status });
  return NextResponse.json(data);
}
