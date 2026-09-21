import { describe, it, expect } from "vitest";
import { createRubricSchema } from "@/lib/validators/rubric";
import { createClassSchema, joinClassSchema } from "@/lib/validators/class";
import { formatRelativeTime, fileSizeToString, getInitials } from "@/lib/utils";

describe("Rubric Validator", () => {
  it("should accept valid rubric with weights summing to exactly 100%", () => {
    const validData = {
      title: "Rubrik Tugas Pemrograman Web",
      criteria: [
        { label: "Kesesuaian Fitur", maxScore: 100, weight: 40 },
        { label: "Kualitas Kode", maxScore: 100, weight: 30 },
        { label: "Dokumentasi & Git", maxScore: 100, weight: 30 },
      ],
    };

    const result = createRubricSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("should reject rubric if total weight does not equal 100%", () => {
    const invalidData = {
      title: "Rubrik Salah",
      criteria: [
        { label: "Kriteria 1", maxScore: 100, weight: 50 },
        { label: "Kriteria 2", maxScore: 100, weight: 40 }, // total = 90%
      ],
    };

    const result = createRubricSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("100%");
    }
  });

  it("should reject rubric with empty criteria list", () => {
    const emptyCriteria = {
      title: "Rubrik Kosong",
      criteria: [],
    };

    const result = createRubricSchema.safeParse(emptyCriteria);
    expect(result.success).toBe(false);
  });
});

describe("Class Validator", () => {
  it("should validate class creation input", () => {
    const validClass = {
      name: "Sistem Basis Data - Kelas B",
      subject: "Basis Data",
      description: "Praktikum PostgreSQL dan Normalisasi",
    };

    const result = createClassSchema.safeParse(validClass);
    expect(result.success).toBe(true);
  });

  it("should reject class with too short name", () => {
    const shortClass = {
      name: "AB",
    };

    const result = createClassSchema.safeParse(shortClass);
    expect(result.success).toBe(false);
  });

  it("should transform join key to uppercase", () => {
    const input = {
      enrollmentKey: "abc12345",
    };

    const result = joinClassSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.enrollmentKey).toBe("ABC12345");
    }
  });
});

describe("Utility Functions", () => {
  it("should format initials correctly", () => {
    expect(getInitials("Budi Santoso")).toBe("BS");
    expect(getInitials("Ahmad Fikri Pratama")).toBe("AF");
    expect(getInitials("Solo")).toBe("S");
  });

  it("should format file sizes accurately", () => {
    expect(fileSizeToString(500)).toBe("500 B");
    expect(fileSizeToString(2048)).toBe("2.0 KB");
    expect(fileSizeToString(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});
