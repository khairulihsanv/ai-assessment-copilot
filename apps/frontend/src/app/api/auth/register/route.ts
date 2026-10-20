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
      let errorMsg = "Gagal mendaftarkan akun. Silakan coba lagi.";
      if (typeof data.detail === "string") {
        errorMsg = data.detail;
      } else if (Array.isArray(data.detail) && data.detail.length > 0) {
        errorMsg =
          typeof data.detail[0]?.msg === "string"
            ? data.detail[0].msg
            : "Format input tidak valid.";
      } else if (typeof data.error === "string") {
        errorMsg = data.error;
      }

      return NextResponse.json(
        {
          success: false,
          error: errorMsg,
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
