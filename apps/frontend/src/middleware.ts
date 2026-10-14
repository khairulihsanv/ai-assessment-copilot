import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function isTokenValid(token: string | undefined): boolean {
  if (!token) return false;
  try {
    const parts = token.split(".");
    const part1 = parts[1];
    if (parts.length !== 3 || !part1) return false;
    const payload = JSON.parse(
      Buffer.from(part1, "base64url").toString("utf-8"),
    );
    if (!payload.sub) return false;
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const { nextUrl } = request;
  const token = request.cookies.get("dexa_session")?.value;
  const loggedIn = isTokenValid(token);

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
