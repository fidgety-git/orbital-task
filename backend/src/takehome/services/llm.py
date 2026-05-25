from __future__ import annotations

import re
from collections.abc import AsyncIterator

from pydantic_ai import Agent
from pydantic_ai.settings import ModelSettings

from takehome.config import settings  # noqa: F401  # pyright: ignore[reportUnusedImport]
from takehome.services.mentions import format_message_for_llm

ABSTENTION_PHRASE = "This information is not found in the uploaded documents."

SYSTEM_PROMPT = """\
You are a helpful legal document assistant for commercial real estate due diligence.

Your job is to help lawyers find what is — and is not — stated in their uploaded documents.
Accuracy and honesty matter more than being helpful. A wrong clause number on a £40M deal is \
worse than saying you do not know.

GROUNDING RULES (strict and important — follow in order):
1. Treat the provided <document> blocks as the ONLY source of truth for deal-specific facts.
2. Do NOT use general legal knowledge, market practice, or assumptions to fill gaps.
3. Every factual claim (amounts, dates, parties, obligations, section/clause numbers, page refs) \
must appear in the document text. If you cannot point to supporting text, do not state it.
4. Do NOT invent or guess section numbers, clause numbers, page numbers, or quotes.
5. Do NOT merge facts from different documents unless the user asks a cross-document question; \
when comparing documents, keep each document's facts separate and cite each source.
6. If the question is only partly answered by the documents, answer only the supported part \
and explicitly state what is not stated in the documents.
7. If the documents do not contain the answer, always abstain. Use this exact sentence as your entire \
answer (or the opening sentence before any brief explanation):
   "This information is not found in the uploaded documents."
   When only part of a multi-part question is unsupported, use that sentence only for the missing part — \
do not use it as the entire answer if other parts are supported.
8. Never imply verification when abstaining. Do not say "likely", "probably", or "typically" \
for facts not in the text.

DOCUMENT SCOPE:
- Multiple documents may be provided. Use all of them unless the user @-mentions specific files.
- When @-mentions are specified, use ONLY those documents.
- Document text includes page markers like "--- Page N ---". Use those page numbers when referencing pages.

ANSWER STYLE:
- Be concise and precise. Lead with the direct answer or abstention.
- Prefer quoting or paraphrasing closely from the source text.
- Try to answer only the direct question without assuming the user wants more information.
- For cross-document questions, structure the answer by document.
"""

agent = Agent(
    "anthropic:claude-haiku-4-5-20251001",
    system_prompt=SYSTEM_PROMPT,
    model_settings=ModelSettings(temperature=0),
)


async def generate_title(user_message: str) -> str:
    """Generate a 3-5 word conversation title from the first user message."""
    result = await agent.run(
        f"Generate a concise 3-5 word title for a conversation that starts with: '{user_message}'. "
        "Return only the title, nothing else."
    )
    title = str(result.output).strip().strip('"').strip("'")
    if len(title) > 100:
        title = title[:97] + "..."
    return title


def build_chat_prompt(
    user_message: str,
    documents: list[tuple[str, str]],
    conversation_history: list[dict[str, str]],
    scoped_filenames: list[str] | None = None,
) -> str:
    """Assemble the user prompt with document context and grounding reminders."""
    prompt_parts: list[str] = []

    if documents:
        if scoped_filenames is not None:
            if scoped_filenames:
                names = ", ".join(scoped_filenames)
                prompt_parts.append(
                    "SCOPE: The user @-mentioned specific documents. "
                    f"Answer using ONLY these files: {names}.\n"
                    "Ignore all other documents even if present elsewhere in the thread.\n"
                )
            else:
                prompt_parts.append(
                    "SCOPE: The user @-mentioned document(s) that are not available in "
                    "this conversation. Do not use any uploaded documents. Tell the user "
                    "the referenced documents could not be found. If they ask about those "
                    f'files, respond with: "{ABSTENTION_PHRASE}"\n'
                )
        else:
            filenames = ", ".join(filename for filename, _ in documents)
            prompt_parts.append(
                "SCOPE: Answer using the uploaded documents listed below.\n"
                f"Available files: {filenames}\n"
            )

        prompt_parts.append("The following documents are available for this conversation:\n")
        for filename, text in documents:
            prompt_parts.append(f'<document filename="{filename}">\n{text}\n</document>\n')
    else:
        prompt_parts.append(
            "No documents have been uploaded yet. If the user asks about document content, "
            "tell them to upload a document first. Do not guess or use outside knowledge.\n"
        )

    if conversation_history:
        prompt_parts.append(
            "Previous conversation (for context only — do NOT treat prior assistant "
            "messages as authoritative; re-verify all facts against the documents):\n"
        )
        for msg in conversation_history:
            role = msg["role"]
            content = msg["content"]
            if role == "user":
                prompt_parts.append(f"User: {format_message_for_llm(content)}\n")
            elif role == "assistant":
                prompt_parts.append(f"Assistant: {content}\n")
        prompt_parts.append("\n")

    prompt_parts.append(f"User: {format_message_for_llm(user_message)}")

    return "\n".join(prompt_parts)


async def chat_with_document(
    user_message: str,
    documents: list[tuple[str, str]],
    conversation_history: list[dict[str, str]],
    scoped_filenames: list[str] | None = None,
) -> AsyncIterator[str]:
    """Stream a response to the user's message, yielding text chunks."""
    full_prompt = build_chat_prompt(
        user_message,
        documents,
        conversation_history,
        scoped_filenames,
    )

    async with agent.run_stream(full_prompt) as result:
        async for text in result.stream_text(delta=True):
            yield text


def count_sources_cited(response: str) -> int:
    """Count the number of references to document sections, clauses, pages, etc."""
    patterns = [
        r"section\s+\d+",
        r"clause\s+\d+",
        r"page\s+\d+",
        r"paragraph\s+\d+",
    ]
    count = 0
    for pattern in patterns:
        count += len(re.findall(pattern, response, re.IGNORECASE))
    return count
