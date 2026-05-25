from __future__ import annotations

import json
from collections.abc import AsyncIterator
from datetime import datetime
from typing import cast

import structlog
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.responses import StreamingResponse

from takehome.db.models import Document, Message
from takehome.db.session import get_session
from takehome.services.citations import (
    CitationStreamFilter,
    citations_from_json,
    citations_to_json,
    process_response_citations,
    split_response_and_citations,
)
from takehome.services.conversation import (
    get_conversation,
    mark_conversation_updated,
    update_conversation,
)
from takehome.services.document import get_documents_for_conversation
from takehome.services.llm import chat_with_document, generate_title
from takehome.services.mentions import (
    DocumentLike,
    format_message_for_llm,
    scope_documents_to_mentions,
)

logger = structlog.get_logger()

router = APIRouter(tags=["messages"])


class CitationOut(BaseModel):
    document_id: str
    filename: str
    page: int
    excerpt: str
    label: str
    verified: bool


class MessageOut(BaseModel):
    id: str
    conversation_id: str
    role: str
    content: str
    verified_citations_count: int
    citations: list[CitationOut] = []
    trust_level: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class MessageCreate(BaseModel):
    content: str


def message_to_out(message: Message) -> MessageOut:
    citations = citations_from_json(message.citations)
    return MessageOut(
        id=message.id,
        conversation_id=message.conversation_id,
        role=message.role,
        content=message.content,
        verified_citations_count=message.sources_cited,
        citations=[CitationOut(**citation.to_dict()) for citation in citations],
        trust_level=message.trust_level,
        created_at=message.created_at,
    )


@router.get(
    "/api/conversations/{conversation_id}/messages",
    response_model=list[MessageOut],
)
async def list_messages(
    conversation_id: str,
    session: AsyncSession = Depends(get_session),
) -> list[MessageOut]:
    """List all messages in a conversation, ordered by creation time."""
    conversation = await get_conversation(session, conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    stmt = (
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
    )
    result = await session.execute(stmt)
    messages = list(result.scalars().all())
    return [message_to_out(message) for message in messages]


@router.post("/api/conversations/{conversation_id}/messages")
async def send_message(
    conversation_id: str,
    body: MessageCreate,
    session: AsyncSession = Depends(get_session),
) -> StreamingResponse:
    """Send a user message and stream back the AI response via SSE."""
    conversation = await get_conversation(session, conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    user_message = Message(
        conversation_id=conversation_id,
        role="user",
        content=body.content,
    )
    session.add(user_message)
    await mark_conversation_updated(session, conversation_id)
    await session.commit()
    await session.refresh(user_message)

    logger.info("User message saved", conversation_id=conversation_id, message_id=user_message.id)

    all_documents = await get_documents_for_conversation(session, conversation_id)
    scoped_documents, scoped_filenames = scope_documents_to_mentions(
        cast(list[DocumentLike], all_documents),
        body.content,
    )
    documents = cast(list[Document], scoped_documents)
    document_context: list[tuple[str, str]] = [
        (doc.filename, doc.extracted_text or "") for doc in documents
    ]

    stmt = (
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .where(Message.id != user_message.id)
        .order_by(Message.created_at.asc())
    )
    result = await session.execute(stmt)
    history_messages = list(result.scalars().all())

    conversation_history: list[dict[str, str]] = [
        {"role": message.role, "content": message.content} for message in history_messages
    ]

    user_msg_count = sum(1 for message in history_messages if message.role == "user")
    is_first_message = user_msg_count == 0

    async def event_stream() -> AsyncIterator[str]:
        stream_filter = CitationStreamFilter()
        fallback_response = (
            "I'm sorry, an error occurred while generating a response. Please try again."
        )

        try:
            async for chunk in chat_with_document(
                user_message=body.content,
                documents=document_context,
                conversation_history=conversation_history,
                scoped_filenames=scoped_filenames,
            ):
                visible = stream_filter.feed(chunk)
                if visible:
                    event_data = json.dumps({"type": "content", "content": visible})
                    yield f"data: {event_data}\n\n"

        except Exception:
            logger.exception(
                "Error during LLM streaming",
                conversation_id=conversation_id,
            )
            if not split_response_and_citations(stream_filter.full_response)[0].strip():
                event_data = json.dumps({"type": "content", "content": fallback_response})
                yield f"data: {event_data}\n\n"

        full_response = stream_filter.full_response.strip() or fallback_response

        display_content, citations, trust_level = process_response_citations(
            full_response,
            documents,
        )
        verified_count = sum(1 for citation in citations if citation.verified)

        from takehome.db.session import async_session as session_factory

        async with session_factory() as save_session:
            assistant_message = Message(
                conversation_id=conversation_id,
                role="assistant",
                content=display_content,
                sources_cited=verified_count,
                citations=citations_to_json(citations),
                trust_level=trust_level,
            )
            save_session.add(assistant_message)
            await mark_conversation_updated(save_session, conversation_id)
            await save_session.commit()
            await save_session.refresh(assistant_message)

            if is_first_message:
                try:
                    title = await generate_title(format_message_for_llm(body.content))
                    await update_conversation(save_session, conversation_id, title)
                    logger.info(
                        "Auto-generated conversation title",
                        conversation_id=conversation_id,
                        title=title,
                    )
                except Exception:
                    logger.exception(
                        "Failed to generate title",
                        conversation_id=conversation_id,
                    )

            message_out = message_to_out(assistant_message)
            message_data = json.dumps(
                {
                    "type": "message",
                    "message": message_out.model_dump(mode="json"),
                }
            )
            yield f"data: {message_data}\n\n"

            done_data = json.dumps(
                {
                    "type": "done",
                    "verified_citations_count": verified_count,
                    "trust_level": trust_level,
                    "message_id": assistant_message.id,
                }
            )
            yield f"data: {done_data}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
