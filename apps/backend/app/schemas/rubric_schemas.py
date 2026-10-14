from typing import Optional, List
from pydantic import BaseModel, Field


class CriterionInput(BaseModel):
    id: Optional[str] = None
    label: str = Field(min_length=1)
    description: Optional[str] = None
    maxScore: float = Field(ge=0)
    weight: float = Field(ge=0, le=100)
    expectedAnswer: Optional[str] = None
    answerKey: Optional[str] = None
    material: Optional[str] = None


class CreateRubricSchema(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    criteria: List[CriterionInput] = Field(min_length=1)


class UpdateRubricSchema(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    criteria: Optional[List[CriterionInput]] = None
