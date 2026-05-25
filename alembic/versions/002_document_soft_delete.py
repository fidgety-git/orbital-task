"""Add soft delete timestamp to documents

Revision ID: 002_document_soft_delete
Revises: 001_initial
Create Date: 2026-05-25 12:35:24.000000
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "002_document_soft_delete"
down_revision: str | None = "001_initial"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("documents", sa.Column("deleted_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("documents", "deleted_at")
