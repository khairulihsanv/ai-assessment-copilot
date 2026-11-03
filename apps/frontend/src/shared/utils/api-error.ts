/**
 * Extract a human-readable error message from an API response body.
 *
 * Understands the shapes we actually receive:
 * - FastAPI `HTTPException`: `{ detail: "..." }`
 * - FastAPI validation errors: `{ detail: [{ loc: [...], msg: "..." }] }`
 * - BFF route handlers: `{ error: "..." }` or `{ message: "..." }`
 */
export function getErrorMessage(data: unknown, fallback: string): string {
  if (!data) return fallback;
  if (typeof data === "string") return data.trim() || fallback;
  if (typeof data !== "object") return fallback;

  const body = data as Record<string, unknown>;
  const detail = body.detail;

  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const messages = detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          const entry = item as { msg?: unknown; loc?: unknown };
          const msg = typeof entry.msg === "string" ? entry.msg : "";
          const loc = Array.isArray(entry.loc)
            ? entry.loc.filter((part) => part !== "body" && part !== "query").join(".")
            : "";
          return loc && msg ? `${loc}: ${msg}` : msg;
        }
        return "";
      })
      .filter(Boolean);
    if (messages.length > 0) return messages.join("; ");
  }

  for (const key of ["error", "message"] as const) {
    const value = body[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return fallback;
}
