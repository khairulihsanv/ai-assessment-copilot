/**
 * The one place that decides which secret signs and verifies session/internal JWTs.
 *
 * Precedence (identical to apps/backend/app/config.py):
 *   INTERNAL_API_SECRET → SECRET_KEY → AUTH_SECRET → NEXTAUTH_SECRET
 *
 * There is deliberately no hardcoded fallback: a missing secret must fail loudly.
 * Pure function with no Node-only imports so it can run in middleware.
 */
export function resolveAuthSecret(): string | undefined {
  return (
    process.env.INTERNAL_API_SECRET ||
    process.env.SECRET_KEY ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    undefined
  );
}
