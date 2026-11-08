import { auth } from "@/server/auth/auth";
import { forwardToBackend, signInternalToken } from "@/server/auth/internal";

// On Vercel a function stops after this many seconds. The draft keeps running on the backend
// and the review page reattaches, so a cut stream only costs a reload.
export const maxDuration = 300;

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

// GET /api/submissions/[submissionId]/grade/stream — Server-Sent Events for AI Grading (Proxied to backend)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ submissionId: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "DOSEN") {
    return new Response("Unauthorized", { status: 401 });
  }

  const { submissionId } = await params;
  const token = signInternalToken({ id: session.user.id, role: session.user.role });

  const { search } = new URL(request.url);
  const res = await forwardToBackend(
    `${BACKEND_URL}/submissions/${submissionId}/grade/stream${search}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "text/event-stream",
      },
      signal: request.signal,
    },
  );

  return new Response(res.body, {
    status: res.status,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
