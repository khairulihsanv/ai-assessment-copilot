"""add_submission_scan_and_pages

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-10-19 12:00:00.000000

Adds scan support:
1. Adds 'SCAN' value to 'SubmissionType' enum.
2. Adds 'allowScan' column to 'assignments' table (default True).
3. Adds 'rawOcrText', 'isEdited', 'ocrStatus', and 'pageCount' columns to 'submission_versions'.
4. Creates 'submission_pages' table for storing per-page original images, OCR output, and student confirmations.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"

    # 1. Add SCAN to SubmissionType enum if on postgres
    if is_postgres:
        op.execute(sa.text("ALTER TYPE \"SubmissionType\" ADD VALUE IF NOT EXISTS 'SCAN';"))

    # 2. Add allowScan to assignments
    op.add_column(
        'assignments',
        sa.Column('allowScan', sa.Boolean(), nullable=False, server_default=sa.text('true'))
    )

    # 3. Add OCR metadata columns to submission_versions
    op.add_column(
        'submission_versions',
        sa.Column('rawOcrText', sa.Text(), nullable=True)
    )
    op.add_column(
        'submission_versions',
        sa.Column('isEdited', sa.Boolean(), nullable=False, server_default=sa.text('false'))
    )
    op.add_column(
        'submission_versions',
        sa.Column('ocrStatus', sa.String(), nullable=False, server_default=sa.text("'NONE'"))
    )
    op.add_column(
        'submission_versions',
        sa.Column('pageCount', sa.Integer(), nullable=False, server_default=sa.text('1'))
    )

    # 4. Create submission_pages table
    op.create_table(
        'submission_pages',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('submissionVersionId', sa.String(), sa.ForeignKey('submission_versions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('pageNumber', sa.Integer(), nullable=False),
        sa.Column('imageUrl', sa.String(), nullable=True),
        sa.Column('imageName', sa.String(), nullable=True),
        sa.Column('mimeType', sa.String(), nullable=True),
        sa.Column('width', sa.Integer(), nullable=True),
        sa.Column('height', sa.Integer(), nullable=True),
        sa.Column('extractedText', sa.Text(), nullable=True),
        sa.Column('confirmedText', sa.Text(), nullable=True),
        sa.Column('ocrStatus', sa.String(), nullable=False, server_default=sa.text("'SUCCESS'")),
        sa.Column('ocrError', sa.Text(), nullable=True),
        sa.Column('source', sa.String(), nullable=False, server_default=sa.text("'IMAGE'")),
        sa.Column('createdAt', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint('submissionVersionId', 'pageNumber', name='submission_pages_version_page_key')
    )


def downgrade() -> None:
    op.drop_table('submission_pages')
    op.drop_column('submission_versions', 'pageCount')
    op.drop_column('submission_versions', 'ocrStatus')
    op.drop_column('submission_versions', 'isEdited')
    op.drop_column('submission_versions', 'rawOcrText')
    op.drop_column('assignments', 'allowScan')
