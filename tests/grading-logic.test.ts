import { describe, expect, it } from "vitest";
import { withReleasedGrade } from "@/server/db/public-selects";

type TestSubmission = {
  releasedGradeId: string | null;
  grades: { id: string; status: string; finalScore: number }[];
};

describe("withReleasedGrade", () => {
  it("should return empty grades array if there are no grades", () => {
    const submission: TestSubmission = { releasedGradeId: null, grades: [] };
    const result = withReleasedGrade(submission);
    expect(result.grades).toHaveLength(0);
  });

  it("should return empty grades array if grade is a draft", () => {
    const submission: TestSubmission = {
      releasedGradeId: null,
      grades: [{ id: "g1", status: "DRAFT", finalScore: 100 }],
    };
    const result = withReleasedGrade(submission);
    expect(result.grades).toHaveLength(0);
  });

  it("should return the grade if it is released and matches releasedGradeId", () => {
    const submission: TestSubmission = {
      releasedGradeId: "g1",
      grades: [
        { id: "g1", status: "RELEASED", finalScore: 80 },
        { id: "g2", status: "DRAFT", finalScore: 90 },
      ],
    };
    const result = withReleasedGrade(submission);
    expect(result.grades).toHaveLength(1);
    expect(result.grades[0].id).toBe("g1");
  });

  it("should return empty if releasedGradeId does not match the released grade", () => {
    const submission: TestSubmission = {
      releasedGradeId: "g2",
      grades: [{ id: "g1", status: "RELEASED", finalScore: 80 }],
    };
    const result = withReleasedGrade(submission);
    expect(result.grades).toHaveLength(0);
  });

  it("should return the grade even if the score is 0", () => {
    const submission: TestSubmission = {
      releasedGradeId: "g1",
      grades: [{ id: "g1", status: "RELEASED", finalScore: 0 }],
    };
    const result = withReleasedGrade(submission);
    expect(result.grades).toHaveLength(1);
    expect(result.grades[0].finalScore).toBe(0);
  });
});
