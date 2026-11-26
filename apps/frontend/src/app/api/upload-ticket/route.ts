import { NextResponse } from "next/server";
import { auth } from "@/server/auth/auth";
import { signUploadTicket, UPLOAD_TICKET_SECONDS } from "@/server/auth/internal";

// The backend's public https URL (e.g. the Tailscale Funnel address). Unset in local and
// Docker setups, where the frontend can pass any file size through to the backend itself.
const BACKEND_PUBLIC_URL = process.env.BACKEND_PUBLIC_URL?.replace(/\/+$/, "") || "";

const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

// POST /api/upload-ticket { classId, assignmentId }
// → { url, token } to upload a submission straight to the backend, or { url: null } to use
//   the regular /api route. Large files cannot pass through a Vercel function (~4.5 MB limit).
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "MAHASISWA") {
    return NextResponse.json(
      { error: "Hanya mahasiswa yang dapat mengumpulkan tugas" },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    classId?: unknown;
    assignmentId?: unknown;
  };
  const { classId, assignmentId } = body;
  if (
    typeof classId !== "string" ||
    typeof assignmentId !== "string" ||
    !ID_RE.test(classId) ||
    !ID_RE.test(assignmentId)
  ) {
    return NextResponse.json({ error: "Kelas atau tugas tidak valid" }, { status: 400 });
  }

  if (!BACKEND_PUBLIC_URL) {
    return NextResponse.json({ url: null });
  }

  const path = `/classes/${classId}/assignments/${assignmentId}/submissions`;
  const token = signUploadTicket({ id: session.user.id, role: session.user.role }, path);
  return NextResponse.json(
    { url: `${BACKEND_PUBLIC_URL}${path}`, token, expiresIn: UPLOAD_TICKET_SECONDS },
    { headers: { "Cache-Control": "no-store" } },
  );
}
