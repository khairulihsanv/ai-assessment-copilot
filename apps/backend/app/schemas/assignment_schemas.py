from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.models.enums import SubmissionType, AssignmentStatus


class CreateAssignmentSchema(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    instructions: str = Field(min_length=1)
    submissionType: SubmissionType = SubmissionType.ANY
    dueDate: datetime
    maxScore: float = Field(default=100.0, ge=0)
    allowLateSubmission: bool = False
    rubricId: Optional[str] = None
    status: AssignmentStatus = AssignmentStatus.PUBLISHED


class UpdateAssignmentSchema(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    instructions: Optional[str] = None
    submissionType: Optional[SubmissionType] = None
    dueDate: Optional[datetime] = None
    maxScore: Optional[float] = Field(default=None, ge=0)
    allowLateSubmission: Optional[bool] = None
    rubricId: Optional[str] = None
    status: Optional[AssignmentStatus] = None
