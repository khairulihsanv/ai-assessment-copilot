import { describe, it, expect, vi } from "vitest";
import app from "../src/app.js";
import jwt from "jsonwebtoken";

// Mock prisma
vi.mock("../src/db/prisma.js", () => {
  return {
    prisma: {
      class: {
        findMany: vi.fn().mockResolvedValue([
          { id: "class-1", name: "Test Class" }
        ])
      }
    }
  };
});

describe("GET /classes", () => {
  it("should return 401 without token", async () => {
    const res = await app.request("/classes");
    expect(res.status).toBe(401);
  });

  it("should return classes with valid token", async () => {
    const token = jwt.sign(
      { sub: "user-1", role: "DOSEN", iss: "frontend", aud: "backend" },
      process.env.INTERNAL_API_SECRET || "default_unsafe_secret_for_dev_only"
    );

    const res = await app.request("/classes", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe("class-1");
  });
});
