from __future__ import annotations

from takehome.services.llm import build_chat_prompt


def test_build_chat_prompt_includes_document_context() -> None:
    prompt = build_chat_prompt(
        user_message="What is the break clause?",
        documents=[("Lease.pdf", "--- Page 1 ---\nBreak clause text.")],
        conversation_history=[],
    )

    assert "Available files: Lease.pdf" in prompt
    assert '<document filename="Lease.pdf">' in prompt
    assert "User: What is the break clause?" in prompt


def test_build_chat_prompt_scopes_to_mentioned_documents() -> None:
    prompt = build_chat_prompt(
        user_message="Summarize @Lease.pdf",
        documents=[("Lease.pdf", "lease text"), ("Title.pdf", "title text")],
        conversation_history=[],
        scoped_filenames=["Lease.pdf"],
    )

    assert "Answer using ONLY these files: Lease.pdf" in prompt
    assert "Ignore all other documents" in prompt


def test_build_chat_prompt_warns_against_trusting_prior_assistant_replies() -> None:
    prompt = build_chat_prompt(
        user_message="Confirm the rent amount",
        documents=[("Lease.pdf", "--- Page 1 ---\nRent is £850,000.")],
        conversation_history=[
            {"role": "assistant", "content": "The rent is £900,000 per year."},
        ],
    )

    assert "do NOT treat prior assistant messages as authoritative" in prompt
    assert "re-verify all facts against the documents" in prompt


def test_build_chat_prompt_handles_invalid_mentions() -> None:
    prompt = build_chat_prompt(
        user_message="Summarize @[Missing.pdf](document:missing-id)",
        documents=[("Lease.pdf", "lease text")],
        conversation_history=[],
        scoped_filenames=[],
    )

    assert "not available in this conversation" in prompt
    assert "Do not use any uploaded documents" in prompt
