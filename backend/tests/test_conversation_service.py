from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from unittest.mock import AsyncMock

import pytest

from takehome.services.conversation import delete_conversation


@dataclass
class ConversationStub:
    id: str
    title: str = "New Conversation"
    deleted_at: datetime | None = None


@pytest.mark.asyncio
async def test_delete_conversation_soft_deletes_active_conversation(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    conversation = ConversationStub("conv-1")
    session = AsyncMock()

    async def fake_get_conversation(
        _session: AsyncMock, conversation_id: str
    ) -> ConversationStub | None:
        return conversation if conversation_id == conversation.id else None

    monkeypatch.setattr(
        "takehome.services.conversation.get_conversation",
        fake_get_conversation,
    )

    deleted = await delete_conversation(session, conversation.id)

    assert deleted is True
    assert conversation.deleted_at is not None
    session.delete.assert_not_called()
    session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_delete_conversation_returns_false_when_missing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session = AsyncMock()

    async def fake_get_conversation(_session: AsyncMock, _conversation_id: str) -> None:
        return None

    monkeypatch.setattr(
        "takehome.services.conversation.get_conversation",
        fake_get_conversation,
    )

    deleted = await delete_conversation(session, "missing")

    assert deleted is False
    session.commit.assert_not_called()
