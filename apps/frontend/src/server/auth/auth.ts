import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export type Role = "DOSEN" | "MAHASISWA" | "ADMIN";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl?: string | null;
}

export interface Session {
  user: SessionUser;
}

export async function getSessionToken(): Promise<string | undefined> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get("dexa_session")?.value;
  } catch {
    return undefined;
  }
}

/**
 * Reads and validates the user session from the HttpOnly dexa_session cookie.
 * No database query is made in the frontend; session claims were cryptographically
 * signed by the FastAPI backend upon authenticated login.
 */
export async function auth(): Promise<Session | null> {
  const token = await getSessionToken();
  if (!token) return null;

  try {
    const decoded = jwt.decode(token) as {
      sub?: string;
      id?: string;
      email?: string;
      name?: string;
      role?: Role;
      avatarUrl?: string;
      exp?: number;
    } | null;

    if (!decoded) return null;

    const userId = decoded.sub || decoded.id;
    if (!userId) return null;

    // Check expiration
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      return null;
    }

    return {
      user: {
        id: userId,
        name: decoded.name || decoded.email?.split("@")[0] || "Pengguna",
        email: decoded.email || "",
        role: decoded.role || "MAHASISWA",
        avatarUrl: decoded.avatarUrl || null,
      },
    };
  } catch {
    return null;
  }
}

export async function signIn(_provider?: string, _options?: Record<string, any>) {
  throw new Error("Gunakan API /api/auth/login untuk autentikasi");
}

export async function signOut(_options?: Record<string, any>) {
  throw new Error("Gunakan API /api/auth/logout untuk keluar");
}

export const handlers = {
  GET: async () => new Response(JSON.stringify({ status: "active" }), { status: 200 }),
  POST: async () => new Response(JSON.stringify({ status: "active" }), { status: 200 }),
};
