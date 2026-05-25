from __future__ import annotations

from takehome.services.mentions import (
    extract_mentioned_document_ids,
    format_message_for_llm,
    scope_documents_to_mentions,
)


def test_extract_mentioned_document_ids_returns_empty_for_plain_text() -> None:
    assert extract_mentioned_document_ids("What are the rent terms?") == []


def test_extract_mentioned_document_ids_parses_single_token() -> None:
    content = "Compare @[Lease.pdf](document:abc123) with the title report"
    assert extract_mentioned_document_ids(content) == ["abc123"]


def test_extract_mentioned_document_ids_parses_multiple_tokens() -> None:
    content = (
        "@[Lease.pdf](document:doc-a) and @[Title.pdf](document:doc-b) disagree"
    )
    assert extract_mentioned_document_ids(content) == ["doc-a", "doc-b"]


def test_format_message_for_llm_replaces_tokens_with_at_filename() -> None:
    content = "Review @[Lease.pdf](document:abc123) for escalation clauses"
    assert (
        format_message_for_llm(content)
        == "Review @Lease.pdf for escalation clauses"
    )


def test_format_message_for_llm_collapses_whitespace() -> None:
    content = "@[A.pdf](document:a)   @[B.pdf](document:b)"
    assert format_message_for_llm(content) == "@A.pdf @B.pdf"


def test_scope_documents_without_mentions_returns_all_documents(make_document) -> None:
    docs = [
        make_document("doc-a", "Lease.pdf"),
        make_document("doc-b", "Title.pdf"),
    ]

    scoped, filenames = scope_documents_to_mentions(docs, "Summarize everything")

    assert scoped == docs
    assert filenames is None


def test_scope_documents_with_valid_mention_limits_context(make_document) -> None:
    lease = make_document("doc-a", "Lease.pdf")
    title = make_document("doc-b", "Title.pdf")
    content = "What does @[Lease.pdf](document:doc-a) say about rent?"

    scoped, filenames = scope_documents_to_mentions([lease, title], content)

    assert scoped == [lease]
    assert filenames == ["Lease.pdf"]


def test_scope_documents_with_unknown_mention_returns_empty_scope(make_document) -> None:
    docs = [
        make_document("doc-a", "Lease.pdf"),
        make_document("doc-b", "Title.pdf"),
    ]
    content = "Check @[Missing.pdf](document:missing-id) for issues"

    scoped, filenames = scope_documents_to_mentions(docs, content)

    assert scoped == []
    assert filenames == []


def test_scope_documents_with_empty_document_list() -> None:
    scoped, filenames = scope_documents_to_mentions([], "@[A.pdf](document:a) question")

    assert scoped == []
    assert filenames == []
