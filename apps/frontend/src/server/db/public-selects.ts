// Private reference content must never enter a student DTO, including legacy keys.
export const publicCriterionSelect = {
  id: true,
  label: true,
  description: true,
  maxScore: true,
  weight: true,
  rubricId: true,
} as const;

export const publicGradeSelect = {
  id: true,
  submissionId: true,
  versionId: true,
  status: true,
  finalScore: true,
  finalFeedback: true,
  createdAt: true,
} as const;

// Both checks matter: a status alone must not publish a non-active revision.
export function withReleasedGrade<
  T extends { releasedGradeId: string | null; grades: { id: string; status: string }[] },
>(submission: T): T {
  return {
    ...submission,
    grades: submission.grades.filter(
      (grade) => grade.id === submission.releasedGradeId && grade.status === "RELEASED",
    ),
  };
}
