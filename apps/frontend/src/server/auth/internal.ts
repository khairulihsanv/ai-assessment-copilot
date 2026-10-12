import jwt from "jsonwebtoken";

function getInternalSecret(): string {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("FATAL: INTERNAL_API_SECRET must be set in production");
    }
    return "default_unsafe_secret_for_dev_only";
  }
  return secret;
}

export function signInternalToken(user: { id: string; role: string }) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      iss: "frontend",
      aud: "backend",
    },
    getInternalSecret(),
    { algorithm: "HS256", expiresIn: "5m" }
  );
}

export async function forwardToBackend(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  try {
    return await fetch(url, init);
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
