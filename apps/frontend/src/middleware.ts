import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const SECRET =
  process.env.INTERNAL_API_SECRET ||
  process.env.AUTH_SECRET ||
  process.env.SECRET_KEY ||
  process.env.NEXTAUTH_SECRET;

async function isTokenValid(token: string | undefined): Promise<boolean> {
  if (!token || !SECRET) return false;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const [headerB64, payloadB64, sigB64] = parts;
    if (!headerB64 || !payloadB64 || !sigB64) return false;

    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf-8"));
    if (!payload.sub) return false;
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return false;
    }
    if (payload.iss && payload.iss !== "dexa-backend") {
      return false;
    }
    if (payload.aud && payload.aud !== "dexa-client") {
      return false;
    }

    const enc = new TextEncoder();
    const data = enc.encode(`${headerB64}.${payloadB64}`);
    const sigBin = Buffer.from(sigB64, "base64url");

    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    return await crypto.subtle.verify("HMAC", key, sigBin, data);
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { nextUrl } = request;
  const token = request.cookies.get("dexa_session")?.value;
  const loggedIn = await isTokenValid(token);

  const pathname = nextUrl.pathname;
  const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/register");
  const isProtectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/classes") ||
    pathname.startsWith("/assignments") ||
    pathname.startsWith("/grading") ||
    pathname.startsWith("/rubrics") ||
    pathname.startsWith("/analytics") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/grades") ||
    pathname.startsWith("/copilot");

  if (isProtectedRoute && !loggedIn) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthRoute && loggedIn) {
    if (nextUrl.searchParams.has("reason") || nextUrl.searchParams.has("registered")) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/classes/:path*",
    "/assignments/:path*",
    "/grading/:path*",
    "/rubrics/:path*",
    "/analytics/:path*",
    "/settings/:path*",
    "/grades/:path*",
    "/copilot/:path*",
    "/login",
    "/register",
  ],
};
