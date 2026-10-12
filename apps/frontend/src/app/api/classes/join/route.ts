import { NextResponse } from "next/server";
import { auth } from "@/server/auth/auth";
import { forwardToBackend, signInternalToken } from "@/server/auth/internal";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

// POST /api/classes/join
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "MAHASISWA") {
    return NextResponse.json(
      { error: "Hanya mahasiswa yang dapat bergabung ke kelas" },
      { status: 401 },
    );
  }

  try {
    const token = signInternalToken({ id: session.user.id, role: session.user.role });
    const body = await request.text();

    const res = await forwardToBackend(`${BACKEND_URL}/classes/join`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data.error || "Gagal bergabung kelas" }, { status: res.status });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Join class error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server saat bergabung kelas" },
      { status: 500 },
    );
  }
}
