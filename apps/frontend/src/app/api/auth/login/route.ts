import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:3001";

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
      let errorMsg = "Email atau kata sandi tidak cocok. Silakan coba lagi.";
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

    const { access_token, user } = data;

    const response = NextResponse.json({
      success: true,
      user,
    });

    const isSecure =
      process.env.COOKIE_SECURE !== "false" &&
      process.env.NODE_ENV === "production" &&
      (request.url.startsWith("https:") || request.headers.get("x-forwarded-proto") === "https");

    // Set HttpOnly session cookie on the frontend response
    response.cookies.set("dexa_session", access_token, {
      httpOnly: true,
      secure: isSecure,
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
