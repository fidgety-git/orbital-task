from __future__ import annotations

import pytest

from takehome.db.session import async_session
from takehome.services.conversation import create_conversation, get_conversation
from takehome.web.routers.conversations import _conversation_detail


@pytest.mark.asyncio
async def test_create_conversation_can_build_detail_response() -> None:
    async with async_session() as session:
        conversation = await create_conversation(session)
        loaded = await get_conversation(session, conversation.id)
        assert loaded is not None
        detail = _conversation_detail(loaded)

    assert detail.documents == []
    assert detail.title
