
from pydantic import BaseModel, Field, model_validator


class CriterionInput(BaseModel):
    id: str | None = None
    label: str = Field(min_length=1)
    description: str | None = None
    maxScore: float = Field(ge=0)
    weight: float = Field(ge=0, le=100)
    expectedAnswer: str | None = None
    answerKey: str | None = None
    material: str | None = None


class CreateRubricSchema(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    criteria: list[CriterionInput] = Field(min_length=1)

    @model_validator(mode="after")
    def validate_total_weight(self):
        total_weight = sum(c.weight for c in self.criteria)
        if abs(total_weight - 100.0) > 0.01:
            raise ValueError(f"Total bobot semua kriteria harus = 100% (saat ini: {total_weight}%)")
        return self


class UpdateRubricSchema(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    criteria: list[CriterionInput] | None = None

    @model_validator(mode="after")
    def validate_total_weight(self):
        if self.criteria is not None:
            if len(self.criteria) == 0:
                raise ValueError("Rubrik harus memiliki minimal 1 kriteria")
            total_weight = sum(c.weight for c in self.criteria)
            if abs(total_weight - 100.0) > 0.01:
                raise ValueError(f"Total bobot semua kriteria harus = 100% (saat ini: {total_weight}%)")
        return self
