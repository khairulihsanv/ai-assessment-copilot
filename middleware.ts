import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/auth.config";

const { auth } = NextAuth(authConfig);

export const middleware = auth;
export default auth;

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
