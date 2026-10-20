from datetime import datetime

from pydantic import BaseModel, Field

from app.models.enums import AssignmentStatus, SubmissionType


class CreateAssignmentSchema(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    instructions: str = Field(min_length=1)
    submissionType: SubmissionType = SubmissionType.ANY
    dueDate: datetime
    maxScore: float = Field(default=100.0, ge=0)
    allowLateSubmission: bool = False
    rubricId: str | None = None
    status: AssignmentStatus = AssignmentStatus.PUBLISHED


class UpdateAssignmentSchema(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    instructions: str | None = None
    submissionType: SubmissionType | None = None
    dueDate: datetime | None = None
    maxScore: float | None = Field(default=None, ge=0)
    allowLateSubmission: bool | None = None
    rubricId: str | None = None
    status: AssignmentStatus | None = None
