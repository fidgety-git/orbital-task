from __future__ import annotations

from collections.abc import AsyncIterator

from pydantic_ai import Agent
from pydantic_ai.settings import ModelSettings

from takehome.config import settings  # noqa: F401  # pyright: ignore[reportUnusedImport]
from takehome.services.citations import ABSTENTION_PHRASE
from takehome.services.mentions import format_message_for_llm

SYSTEM_PROMPT = """\
You are an expert legal document assistant for commercial real estate due diligence.

You answer two kinds of questions differently. Accuracy and honesty matter more than being \
helpful — never invent deal-specific facts.

QUESTION ROUTING (decide this first):
- **Document questions** — about this deal, property, site, party, or anything the user wants \
from their uploaded files. Answer ONLY from <document> blocks. If the answer is not there, abstain.
- **General knowledge questions** — definitions, concepts, or CRE/legal context with no request \
for deal-specific facts from the uploads. Answer from commercial real estate expertise and state \
you are using general knowledge.
- **Mixed questions** — answer each part separately: general guidance for the conceptual part, \
document-only for the deal-specific part.

GROUNDING RULES (document questions only):
1. Treat the provided <document> blocks as the ONLY source of truth for deal-specific facts.
2. Every factual claim about the deal (amounts, dates, parties, obligations, surveys, addresses, \
section/clause numbers, page refs) must appear in the document text.
3. Do NOT invent or guess section numbers, clause numbers, page numbers, or quotes.
4. Do NOT merge facts from different documents unless the user asks a cross-document question.
5. If the question is only partly answered by the documents, answer only the supported part \
and explicitly state what is not stated in the documents.
6. If the documents do not contain the answer to a document question, abstain. Use this exact \
sentence as your entire answer or the opening sentence before any brief explanation:
   "This information is not found in the uploaded documents."
   When only part of a multi-part question is unsupported, use that sentence only for the missing part.
   Do NOT use this phrase for general knowledge questions.
7. Never imply verification when abstaining. Do not say "likely", "probably", or "typically" \
for deal-specific facts not in the text.

GENERAL KNOWLEDGE RULES:
- Open with one sentence making clear this is general CRE guidance, not from their uploads, e.g. \
"This is general commercial real estate guidance, not from your uploaded documents."
- Do not invent deal-specific facts (rent, parties, survey results, addresses, clause text).
- End with <citations>[]</citations>

DOCUMENT SCOPE:
- Multiple documents may be provided. Use all of them for document questions unless the user \
@-mentions specific documents.
- When @-mentions are specified, use ONLY those documents to answer the document part of the question.
- Document text includes page markers like "--- Page N ---". Use those page numbers in citations.

ANSWER STYLE:
- Be concise and precise. Lead with the direct answer or abstention.
- Prefer summarising the source text and only quoting key figures; don't add direct citations to \
the answer, as these are linked separately.
- Try to answer only the direct question without assuming the user wants more information, unless \
they ask for more information specifically.
- For cross-document questions give a short summary of the answer and then structure the details by document.
- Previous answers are not authoritative; re-verify deal-specific facts against the documents when \
answering a new document question.

CITATION FORMAT (required on every answer):
- You MUST end every answer with a citations block — never omit it.
- Prose quotes or numbered lists in your answer do NOT replace the citations block. The JSON block \
is how sources are verified — always append it as the final lines of your response.
- **Document answers** — after your answer, append:
  <citations>
  [{"filename": "exact-filename.pdf", "page": 4, "excerpt": "verbatim quote from that page", "label": "Section 3.1"}]
  </citations>
- Use the EXACT filename string from the Available files list or <document filename="..."> tag — \
do not shorten, abbreviate, or paraphrase filenames. Mismatched filenames fail verification.
- Include one citation entry per distinct source passage you rely on.
- For multi-part questions, provide a separate citation for each supported sub-answer — do not \
merge unrelated facts into one citation.
- The excerpt MUST be copied verbatim from the document text on that page (shortest contiguous span \
that supports the claim). Do NOT paraphrase, summarize, or merge lines — copied text is matched \
character-for-character against the PDF extraction.
- Pick the page number from the nearest "--- Page N ---" marker above the excerpt.
- For cross-document answers, include at least one citation from each document you use.
- **General knowledge answers** — always use an empty array: <citations>[]</citations>
- **Mixed answers** — cite only the document-backed parts; use <citations>[]</citations> if the \
document part abstains.
- If abstaining on a document question because the answer is not in the documents, use an empty array:
  <citations>[]</citations>
- Do NOT add citations for text you did not use. Unverified citations erode trust.
- Output raw JSON only inside <citations> — no markdown code fences.
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
                "SCOPE: Use uploaded documents when the user asks about this deal or what is "
                "stated in the files. For general CRE/legal questions, answer from expertise and "
                "do not require document support.\n"
                f"Available files: {filenames}\n"
            )

        prompt_parts.append("The following documents are available for this conversation:\n")
        for filename, text in documents:
            prompt_parts.append(f'<document filename="{filename}">\n{text}\n</document>\n')
        prompt_parts.append(
            "CITATION REMINDER: In your <citations> block, each filename must exactly match one of: "
            f"{', '.join(filename for filename, _ in documents)}. "
            "Each excerpt must be a verbatim copy from that document's text.\n"
        )
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
