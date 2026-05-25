from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from takehome.db.models import Conversation


def _active_conversations_filter():
    return Conversation.deleted_at.is_(None)


async def create_conversation(session: AsyncSession) -> Conversation:
    """Create a new conversation with default title."""
    conversation = Conversation()
    session.add(conversation)
    await session.commit()
    await session.refresh(conversation)
    return conversation


async def list_conversations(session: AsyncSession) -> list[Conversation]:
    """List active conversations ordered by most recently updated."""
    stmt = (
        select(Conversation)
        .options(selectinload(Conversation.documents))
        .where(_active_conversations_filter())
        .order_by(Conversation.updated_at.desc())
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def get_conversation(session: AsyncSession, conversation_id: str) -> Conversation | None:
    """Get a single active conversation with its documents eagerly loaded."""
    stmt = (
        select(Conversation)
        .options(selectinload(Conversation.documents))
        .where(Conversation.id == conversation_id, _active_conversations_filter())
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def mark_conversation_updated(session: AsyncSession, conversation_id: str) -> None:
    """Mark a conversation as recently active for sidebar ordering."""
    conversation = await get_conversation(session, conversation_id)
    if conversation is not None:
        conversation.updated_at = datetime.now(UTC).replace(tzinfo=None)


async def update_conversation(
    session: AsyncSession, conversation_id: str, title: str
) -> Conversation | None:
    """Update the title of a conversation."""
    conversation = await get_conversation(session, conversation_id)
    if conversation is None:
        return None
    conversation.title = title
    await mark_conversation_updated(session, conversation_id)
    await session.commit()
    await session.refresh(conversation)
    return conversation


async def delete_conversation(session: AsyncSession, conversation_id: str) -> bool:
    """Soft-delete a conversation. Returns True if an active conversation existed."""
    conversation = await get_conversation(session, conversation_id)
    if conversation is None:
        return False
    conversation.deleted_at = datetime.now(UTC).replace(tzinfo=None)
    await session.commit()
    return True
