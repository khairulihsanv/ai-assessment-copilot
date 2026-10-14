import { NextResponse } from "next/server";
import { auth } from "@/server/auth/auth";
import { forwardToBackend } from "@/server/auth/internal";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

// POST /api/ai/test — Test AI provider connectivity via backend
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "DOSEN") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.text();
    const res = await forwardToBackend(`${BACKEND_URL}/ai/test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("[AI Test BFF Error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: "AI provider request failed",
        provider: "groq",
        message: error instanceof Error ? error.message : "Gagal menghubungi backend AI.",
      },
      { status: 503 },
    );
  }
}
