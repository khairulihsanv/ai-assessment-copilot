import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, role } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: "Nama, email, dan kata sandi wajib diisi" },
        { status: 400 },
      );
    }

    const backendRes = await fetch(`${BACKEND_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role: role || "MAHASISWA",
      }),
    });

    const data = await backendRes.json().catch(() => ({}));

    if (!backendRes.ok) {
      return NextResponse.json(
        {
          success: false,
          error: data.detail || "Gagal mendaftarkan akun. Silakan coba lagi.",
        },
        { status: backendRes.status },
      );
    }

    return NextResponse.json(
      {
        success: true,
        user: data.user,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[Register BFF Error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Gagal memproses pendaftaran. Periksa koneksi backend Anda.",
      },
      { status: 503 },
    );
  }
}
