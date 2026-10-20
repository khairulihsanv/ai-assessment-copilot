import { NextResponse } from "next/server";
import { auth } from "@/server/auth/auth";
import { forwardToBackend } from "@/server/auth/internal";
export const maxDuration = 75;
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Format pertanyaan tidak valid." }, { status: 400 });
  }
  const response = await forwardToBackend(
    `${process.env.BACKEND_URL || "http://localhost:3001"}/ai/study`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(65000),
    },
  );
  const data = await response.json().catch(() => ({ detail: "Layanan AI belum dapat dihubungi." }));
  return NextResponse.json(data, { status: response.status });
}
