from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class CreateClassSchema(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = None
    subject: Optional[str] = None


class UpdateClassSchema(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    description: Optional[str] = None
    subject: Optional[str] = None
    isArchived: Optional[bool] = None


class JoinClassSchema(BaseModel):
    enrollmentKey: str = Field(min_length=1, max_length=20)
