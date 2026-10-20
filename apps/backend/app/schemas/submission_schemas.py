
from pydantic import BaseModel, Field


class FinalizeSchema(BaseModel):
    expectedSubmissionVersionId: str = Field(min_length=1)
    expectedReleasedGradeId: str | None = None
    finalScore: float = Field(ge=0)
    finalFeedback: str = Field(min_length=3)
    isAIAssisted: bool = False
    editedFromAI: bool = False


class RevertFinalizeSchema(BaseModel):
    expectedReleasedGradeId: str = Field(min_length=1)
    reason: str | None = None
