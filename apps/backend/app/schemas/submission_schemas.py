from typing import Literal

from pydantic import BaseModel, Field


class CriterionDecision(BaseModel):
    """Lecturer's decision on one rubric criterion (FR-06)."""

    criterionId: str = Field(min_length=1)
    aiScore: float | None = None
    finalScore: float = Field(ge=0)
    decision: Literal["accepted", "edited", "rejected", "manual"]
    aiFeedback: str | None = None
    finalFeedback: str | None = Field(default=None, max_length=4000)


class FinalizeSchema(BaseModel):
    expectedSubmissionVersionId: str = Field(min_length=1)
    expectedReleasedGradeId: str | None = None
    finalScore: float = Field(ge=0)
    finalFeedback: str = Field(min_length=3)
    isAIAssisted: bool = False
    editedFromAI: bool = False
    evaluationRunId: str | None = None
    perCriterion: list[CriterionDecision] | None = None
    changeReason: str | None = Field(default=None, max_length=1000)


class RevertFinalizeSchema(BaseModel):
    expectedReleasedGradeId: str = Field(min_length=1)
    reason: str | None = None
