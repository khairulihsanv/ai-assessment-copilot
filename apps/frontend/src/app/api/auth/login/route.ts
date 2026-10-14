import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email dan kata sandi wajib diisi" },
        { status: 400 },
      );
    }

    const backendRes = await fetch(`${BACKEND_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    });

    const data = await backendRes.json().catch(() => ({}));

    if (!backendRes.ok) {
      return NextResponse.json(
        {
          success: false,
          error: data.detail || "Email atau kata sandi tidak cocok. Silakan coba lagi.",
        },
        { status: backendRes.status },
      );
    }

    const { access_token, user } = data;

    const response = NextResponse.json({
      success: true,
      user,
    });

    // Set HttpOnly session cookie on the frontend response
    response.cookies.set("dexa_session", access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 12 * 60 * 60, // 12 hours
    });

    return response;
  } catch (error) {
    console.error("[Login BFF Error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Gagal menghubungi server autentikasi. Silakan periksa koneksi Anda.",
      },
      { status: 503 },
    );
  }
}
