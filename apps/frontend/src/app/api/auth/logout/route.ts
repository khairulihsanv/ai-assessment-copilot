import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("dexa_session")?.value;

    if (token) {
      // Notify backend to invalidate token if stateful tracking is enabled
      await fetch(`${BACKEND_URL}/auth/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }).catch(() => {});
    }

    const response = NextResponse.json({ success: true });

    const isSecure =
      process.env.COOKIE_SECURE !== "false" &&
      process.env.NODE_ENV === "production" &&
      (request.url.startsWith("https:") || request.headers.get("x-forwarded-proto") === "https");

    // Clear session cookie
    response.cookies.set("dexa_session", "", {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error("[Logout BFF Error]:", error);
    const response = NextResponse.json({ success: true });
    response.cookies.set("dexa_session", "", {
      path: "/",
      maxAge: 0,
    });
    return response;
  }
}
