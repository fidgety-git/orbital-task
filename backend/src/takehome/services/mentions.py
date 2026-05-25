from __future__ import annotations

import re
from typing import Protocol


class DocumentLike(Protocol):
    id: str
    filename: str


MENTION_PATTERN = re.compile(r"@\[([^\]]+)\]\(document:([^)]+)\)")


def extract_mentioned_document_ids(content: str) -> list[str]:
    """Return document IDs referenced via @[filename](document:id) tokens."""
    return [match.group(2) for match in MENTION_PATTERN.finditer(content)]


def format_message_for_llm(content: str) -> str:
    """Replace mention tokens with readable @filename references for the LLM."""
    formatted = MENTION_PATTERN.sub(lambda match: f"@{match.group(1)}", content)
    return re.sub(r"\s+", " ", formatted).strip()


def scope_documents_to_mentions(
    documents: list[DocumentLike],
    content: str,
) -> tuple[list[DocumentLike], list[str] | None]:
    """Limit document context to @-mentioned files when valid mentions are present."""
    mentioned_ids = extract_mentioned_document_ids(content)
    if not mentioned_ids:
        return list(documents), None

    mentioned_set = set(mentioned_ids)
    scoped = [doc for doc in documents if doc.id in mentioned_set]
    if not scoped:
        return [], []

    return scoped, [doc.filename for doc in scoped]
