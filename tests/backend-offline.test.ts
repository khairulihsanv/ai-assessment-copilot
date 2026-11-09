import { describe, expect, it } from "vitest";
import { isGatewayFailure } from "@/server/api/backend-offline";

describe("isGatewayFailure", () => {
  it("treats a bodyless 502/503/504 as the backend being off", () => {
    expect(isGatewayFailure(502, {})).toBe(true);
    expect(isGatewayFailure(503, null)).toBe(true);
    expect(isGatewayFailure(504, "Bad Gateway")).toBe(true);
  });

  it("keeps FastAPI's own errors, which always carry `detail`", () => {
    expect(isGatewayFailure(503, { detail: "Model AI tidak tersedia" })).toBe(false);
    expect(isGatewayFailure(401, {})).toBe(false);
    expect(isGatewayFailure(500, {})).toBe(false);
  });
});
