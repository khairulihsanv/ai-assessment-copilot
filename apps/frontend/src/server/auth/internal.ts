import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export async function getSessionToken(): Promise<string | undefined> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get("dexa_session")?.value;
  } catch {
    return undefined;
  }
}

/**
 * Signs a valid internal JWT token for backend authentication from server-side handlers
 * or when proxying with an authenticated session.
 */
export function signInternalToken(user?: { id?: string; role?: string }): string {
  if (!user || !user.id) return "";
  const secret =
    process.env.SECRET_KEY ||
    process.env.INTERNAL_API_SECRET ||
    "dexa-assessment-secure-auth-secret-key-32chars-min-2026";
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    {
      sub: String(user.id),
      id: String(user.id),
      role: user.role,
      iat: now,
      exp: now + 3600,
      iss: "dexa-backend",
      aud: "dexa-client",
    },
    secret,
    { algorithm: "HS256" },
  );
}

/**
 * Forwards requests to the FastAPI backend.
 * Automatically injects the user's authentic dexa_session cookie as Bearer token
 * if no Authorization header was explicitly provided.
 */
export async function forwardToBackend(url: string, init?: RequestInit): Promise<Response> {
  try {
    const headers = new Headers(init?.headers || {});
    const authHeader = headers.get("Authorization");

    // Inject authentic session token if no auth header, or if it is empty/falsy
    if (
      !authHeader ||
      authHeader.trim() === "Bearer" ||
      authHeader.trim() === "Bearer undefined" ||
      authHeader.trim() === "Bearer null" ||
      authHeader.trim() === "Bearer "
    ) {
      const token = await getSessionToken();
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
    }
    return await fetch(url, {
      ...init,
      headers,
    });
  } catch (error) {
    console.error("[Backend Proxy Error]:", error);
    return new Response(
      JSON.stringify({ error: "Layanan backend tidak tersedia atau gagal dihubungi" }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
