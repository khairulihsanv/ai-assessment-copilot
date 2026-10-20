import { NextResponse } from "next/server";
import { auth } from "@/server/auth/auth";
import { forwardToBackend, signInternalToken } from "@/server/auth/internal";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = signInternalToken({ id: session.user.id, role: session.user.role });
    const contentType = request.headers.get("content-type") || "";
    const body = await request.arrayBuffer();

    const res = await forwardToBackend(`${BACKEND_URL}/ai/extract-text`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": contentType,
      },
      body,
      // @ts-expect-error
      duplex: "half",
    });

    const data = await res.json();
    if (!res.ok) return NextResponse.json(data, { status: res.status });
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error extracting text:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal mengekstrak teks dari file." },
      { status: 500 },
    );
  }
}
