"""grade_revision_ai_review

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-11-03 10:00:00.000000

FR-06/07: record which AI draft (evaluation run) a lecturer reviewed and their
per-criterion decisions (accepted / edited / rejected / manual) on each grade revision.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, None] = "c3d4e5f6a7b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    json_type = postgresql.JSONB() if bind.dialect.name == "postgresql" else sa.JSON()

    op.add_column("grade_revisions", sa.Column("evaluationRunId", sa.String(), nullable=True))
    op.add_column("grade_revisions", sa.Column("perCriterionFinal", json_type, nullable=True))
    op.create_foreign_key(
        "grade_revisions_evaluationRunId_fkey",
        "grade_revisions",
        "evaluation_runs",
        ["evaluationRunId"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("grade_revisions_evaluationRunId_idx", "grade_revisions", ["evaluationRunId"])


def downgrade() -> None:
    op.drop_index("grade_revisions_evaluationRunId_idx", table_name="grade_revisions")
    op.drop_constraint("grade_revisions_evaluationRunId_fkey", "grade_revisions", type_="foreignkey")
    op.drop_column("grade_revisions", "perCriterionFinal")
    op.drop_column("grade_revisions", "evaluationRunId")
