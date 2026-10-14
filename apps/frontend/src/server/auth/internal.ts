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
 * Forwards requests to the FastAPI backend.
 * Automatically injects the user's authentic dexa_session cookie as Bearer token
 * if no Authorization header was explicitly provided.
 */
export async function forwardToBackend(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  try {
    const headers = new Headers(init?.headers || {});
    if (!headers.has("Authorization")) {
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

/**
 * @deprecated Frontend no longer self-signs tokens; backend validates authentic session tokens.
 */
export function signInternalToken(_user?: { id?: string; role?: string }): string {
  return "";
}
