export { auth as middleware } from "@/lib/auth/auth";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/classes/:path*",
    "/login",
    "/register",
  ],
};
