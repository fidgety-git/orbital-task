"""Add soft delete timestamp to conversations

Revision ID: 003_conversation_soft_delete
Revises: 002_document_soft_delete
Create Date: 2026-05-25 16:30:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "003_conversation_soft_delete"
down_revision: str | None = "002_document_soft_delete"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("conversations", sa.Column("deleted_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("conversations", "deleted_at")
