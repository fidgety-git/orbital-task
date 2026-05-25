from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock

import pytest

from takehome.services.document import delete_document, find_document_by_filename


@dataclass
class DocumentStub:
    id: str
    filename: str
    conversation_id: str = "conv-1"
    file_path: str = "/tmp/test.pdf"
    deleted_at: datetime | None = None


@pytest.mark.asyncio
async def test_find_document_by_filename_returns_match() -> None:
    document = DocumentStub("doc-1", "Commercial Lease.pdf")
    result = MagicMock()
    result.scalar_one_or_none.return_value = document
    session = AsyncMock()
    session.execute.return_value = result

    found = await find_document_by_filename(session, "conv-1", "commercial lease.pdf")

    assert found is document
    session.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_find_document_by_filename_returns_none_when_missing() -> None:
    result = MagicMock()
    result.scalar_one_or_none.return_value = None
    session = AsyncMock()
    session.execute.return_value = result

    found = await find_document_by_filename(session, "conv-1", "missing.pdf")

    assert found is None


@pytest.mark.asyncio
async def test_delete_document_soft_deletes_active_document(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    document = DocumentStub("doc-1", "Lease.pdf")
    session = AsyncMock()
    unlinked_paths: list[str] = []

    async def fake_get_document(
        _session: AsyncMock, document_id: str
    ) -> DocumentStub | None:
        return document if document_id == document.id else None

    monkeypatch.setattr(
        "takehome.services.document.get_document",
        fake_get_document,
    )
    monkeypatch.setattr(
        "takehome.services.document.mark_conversation_updated",
        AsyncMock(),
    )
    monkeypatch.setattr(
        "takehome.services.document.os.unlink",
        lambda path: unlinked_paths.append(path),
    )

    deleted = await delete_document(session, document.id)

    assert deleted is True
    assert document.deleted_at is not None
    session.delete.assert_not_called()
    session.commit.assert_awaited_once()
    assert unlinked_paths == []


@pytest.mark.asyncio
async def test_delete_document_returns_false_when_missing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session = AsyncMock()

    async def fake_get_document(_session: AsyncMock, _document_id: str) -> None:
        return None

    monkeypatch.setattr(
        "takehome.services.document.get_document",
        fake_get_document,
    )

    deleted = await delete_document(session, "missing")

    assert deleted is False
    session.delete.assert_not_called()
