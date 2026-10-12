import { auth } from "@/server/auth/auth";
import { forwardToBackend, signInternalToken } from "@/server/auth/internal";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

export interface BackendClientOptions extends RequestInit {
  userId?: string;
  role?: string;
}

export async function fetchFromBackend<T = any>(
  path: string,
  init?: BackendClientOptions,
): Promise<{
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
  json: () => Promise<T>;
}> {
  let userId = init?.userId;
  let role = init?.role;

  if (!userId || !role) {
    const session = await auth();
    if (!session?.user) {
      return {
        ok: false,
        data: null,
        status: 401,
        error: "Unauthorized",
        json: async () => {
          throw new Error("Unauthorized");
        },
      };
    }
    userId = session.user.id;
    role = session.user.role;
  }

  const token = signInternalToken({
    id: userId,
    role,
  });

  const { userId: _u, role: _r, ...requestInit } = init || {};

  const url = `${BACKEND_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await forwardToBackend(url, {
    ...requestInit,
    headers: {
      ...requestInit?.headers,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    return {
      ok: false,
      data: null,
      status: res.status,
      error: errorBody.error || `Backend returned status ${res.status}`,
      json: async () => errorBody as T,
    };
  }

  const data = (await res.json()) as T;
  return {
    ok: true,
    data,
    status: res.status,
    json: async () => data,
  };
}
