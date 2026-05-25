from __future__ import annotations

from dataclasses import dataclass

import pytest


@dataclass
class DocumentStub:
    id: str
    filename: str
    conversation_id: str = "conv1"
    extracted_text: str | None = None


@pytest.fixture
def make_document():
    def _make_document(
        doc_id: str = "doc1",
        filename: str = "lease.pdf",
        conversation_id: str = "conv1",
        extracted_text: str | None = None,
    ) -> DocumentStub:
        return DocumentStub(
            id=doc_id,
            filename=filename,
            conversation_id=conversation_id,
            extracted_text=extracted_text,
        )

    return _make_document
