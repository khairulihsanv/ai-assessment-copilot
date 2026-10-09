import { describe, expect, it } from "vitest";
import { withReleasedGrade } from "@/lib/db/public-selects";
import { requireTestDatabaseUrl } from "@/lib/testing/database-url";

describe("Disposable test database guard", () => {
  it("accepts the explicit local CI database", () => {
    const url = "postgresql://test_user:test_password@localhost:5432/test_db?schema=public";
    expect(requireTestDatabaseUrl(url)).toBe(url);
  });
  it.each([
    undefined,
    "invalid",
    "postgresql://owner:pass@db.example.com/test_db",
    "postgresql://test_user:pass@localhost/neondb",
    "postgresql://owner:pass@localhost/test_db",
    "postgresql://test_user:pass@localhost/test_db?host=db.example.com",
    "postgresql://test_user:pass@localhost/test_db?schema=other",
  ])("rejects an unapproved or missing target (%s)", (url) => {
    expect(() => requireTestDatabaseUrl(url)).toThrow();
  });
});

describe("Released grade visibility", () => {
  it("hides RELEASED rows when no pointer is published", () => {
    expect(
      withReleasedGrade({ releasedGradeId: null, grades: [{ id: "g", status: "RELEASED" }] })
        .grades,
    ).toEqual([]);
  });
  it("hides withdrawn grade even when the pointer still exists", () => {
    expect(
      withReleasedGrade({ releasedGradeId: "g", grades: [{ id: "g", status: "WITHDRAWN" }] })
        .grades,
    ).toEqual([]);
  });
});
