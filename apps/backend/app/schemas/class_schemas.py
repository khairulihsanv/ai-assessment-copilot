from pydantic import BaseModel, Field


class CreateClassSchema(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str | None = None
    subject: str | None = None


class UpdateClassSchema(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = None
    subject: str | None = None
    isArchived: bool | None = None


class JoinClassSchema(BaseModel):
    enrollmentKey: str = Field(min_length=1, max_length=20)
