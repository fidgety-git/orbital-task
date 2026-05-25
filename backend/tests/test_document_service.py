from __future__ import annotations

from dataclasses import dataclass
from unittest.mock import AsyncMock, MagicMock

import pytest

from takehome.services.document import find_document_by_filename


@dataclass
class DocumentStub:
    id: str
    filename: str


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
