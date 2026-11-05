"""rubric criteria keep the order the lecturer wrote them in

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-11-05 09:00:00.000000

Criteria had no order of their own and were sorted by their random id, so they showed up
shuffled. Existing rows have no record of the original order: they keep the order they are
shown in today, and saving the rubric once records the order on screen.
"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "e5f6a7b8c9d0"
down_revision: Union[str, None] = "d4e5f6a7b8c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "rubric_criteria",
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
    )
    op.execute(
        """
        UPDATE rubric_criteria AS c
        SET position = ordered.rn
        FROM (
            SELECT id, ROW_NUMBER() OVER (PARTITION BY "rubricId" ORDER BY id) - 1 AS rn
            FROM rubric_criteria
        ) AS ordered
        WHERE c.id = ordered.id
        """
    )


def downgrade() -> None:
    op.drop_column("rubric_criteria", "position")
