import { NextResponse } from "next/server";
import { auth } from "@/server/auth/auth";
import { forwardToBackend, signInternalToken } from "@/server/auth/internal";
import { getErrorMessage } from "@/shared/utils/api-error";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

// GET /api/ai/status — whether the configured model can produce AI drafts right now.
export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "DOSEN") {
    return NextResponse.json(
      { error: "Hanya dosen yang dapat melihat status AI" },
      { status: 403 },
    );
  }

  try {
    const token = signInternalToken({ id: session.user.id, role: session.user.role });
    const res = await forwardToBackend(`${BACKEND_URL}/ai/status`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { ready: false, message: getErrorMessage(data, "Status AI tidak dapat dibaca.") },
        { status: res.status },
      );
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { ready: false, reachable: false, message: "Backend tidak dapat dihubungi." },
      { status: 503 },
    );
  }
}
