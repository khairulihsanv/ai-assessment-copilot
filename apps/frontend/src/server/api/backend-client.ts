import { auth, getSessionToken } from "@/server/auth/auth";
import { forwardToBackend } from "@/server/auth/internal";

const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:3001";

export interface BackendClientOptions extends RequestInit {
  userId?: string;
  role?: string;
  token?: string;
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
  let token = init?.token;
  if (!token) {
    token = await getSessionToken();
  }

  const { userId: _u, role: _r, token: _t, ...requestInit } = init || {};

  const url = `${BACKEND_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(requestInit.headers || {});

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Content-Type") && requestInit.body && typeof requestInit.body === "string") {
    headers.set("Content-Type", "application/json");
  }

  const res = await forwardToBackend(url, {
    ...requestInit,
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    return {
      ok: false,
      data: null,
      status: res.status,
      error: errorBody.detail || errorBody.error || `Backend returned status ${res.status}`,
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
