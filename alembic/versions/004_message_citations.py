"""Add citations and trust_level to messages

Revision ID: 004_message_citations
Revises: 003_conversation_soft_delete
Create Date: 2026-05-25 13:15:45.000000
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "004_message_citations"
down_revision: str | None = "003_conversation_soft_delete"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("messages", sa.Column("citations", sa.Text(), nullable=True))
    op.add_column("messages", sa.Column("trust_level", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("messages", "trust_level")
    op.drop_column("messages", "citations")
