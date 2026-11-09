/**
 * The backend runs behind a tunnel, so "backend is down" reaches the BFF in two shapes:
 * fetch throws (tunnel or laptop off), or the gateway answers 502/503/504 without a
 * FastAPI body (tunnel up, backend still starting). Both get the same message, so a
 * user is never told their password is wrong when the server is simply off.
 */
export const BACKEND_OFFLINE_MESSAGE =
  "Server Dexa sedang tidak aktif atau baru dinyalakan. Coba lagi dalam 1–2 menit.";

/** Short requests (login, register) should not hang until the platform kills the function. */
export const AUTH_REQUEST_TIMEOUT_MS = 20_000;

const GATEWAY_STATUSES = new Set([502, 503, 504]);

/** True when a response came from a gateway, not from FastAPI (which always sends `detail`). */
export function isGatewayFailure(status: number, body: unknown): boolean {
  if (!GATEWAY_STATUSES.has(status)) return false;
  return !(body && typeof body === "object" && "detail" in body);
}

export function backendOfflineBody() {
  return { success: false, error: BACKEND_OFFLINE_MESSAGE, code: "BACKEND_OFFLINE" } as const;
}
