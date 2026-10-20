import type { Context, Next } from "hono";
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

export type AuthContext = {
  Variables: {
    user: {
      id: string;
      role: string;
    };
  };
};

export async function internalAuthMiddleware(c: Context<AuthContext>, next: Next) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Missing or invalid Authorization header" }, 401);
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, getInternalSecret(), {
      issuer: "frontend",
      audience: "backend",
      algorithms: ["HS256"],
    }) as jwt.JwtPayload;

    if (!decoded.sub || !decoded.role) {
      return c.json({ error: "Invalid token payload" }, 401);
    }

    c.set("user", {
      id: decoded.sub,
      role: decoded.role as string,
    });

    await next();
  } catch (_err) {
    return c.json({ error: "Unauthorized: Invalid signature or expired token" }, 401);
  }
}
