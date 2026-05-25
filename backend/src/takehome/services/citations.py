from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass
from typing import Any, cast

import ftfy
from rapidfuzz import fuzz

from takehome.db.models import Document

CITATIONS_START = "<citations>"
CITATIONS_END = "</citations>"
FUZZY_MATCH_THRESHOLD = 78
FILENAME_MATCH_THRESHOLD = 82
FILENAME_AMBIGUITY_GAP = 12
ABSTENTION_PHRASE = "This information is not found in the uploaded documents."

NOT_FOUND_PATTERNS = [
    r"not (?:found|present|included|mentioned|stated) in (?:the )?(?:document|documents|uploaded)",
    r"(?:does not|doesn't|do not|don't) appear in (?:the )?(?:document|documents|uploaded)",
    r"no (?:relevant )?information (?:is )?(?:found|available) in (?:the )?(?:document|documents|uploaded)",
    r"(?:is )?not in (?:the )?(?:document|documents|uploaded)",
]

PAGE_MARKER = re.compile(r"--- Page (\d+) ---")


@dataclass
class Citation:
    document_id: str
    filename: str
    page: int
    excerpt: str
    label: str
    verified: bool

    def to_dict(self) -> dict[str, Any]:
        return {
            "document_id": self.document_id,
            "filename": self.filename,
            "page": self.page,
            "excerpt": self.excerpt,
            "label": self.label,
            "verified": self.verified,
        }

    @classmethod
    def from_raw_item(
        cls,
        item: dict[str, Any],
        *,
        doc: Document | None,
        page: int,
        verified: bool,
    ) -> Citation:
        filename = str(item.get("filename", "")).strip()
        excerpt = str(item.get("excerpt", "")).strip()
        label = str(item.get("label", "")).strip() or excerpt[:40] or filename
        return cls(
            document_id=doc.id if doc else str(item.get("document_id", "")),
            filename=doc.filename if doc else filename,
            page=page,
            excerpt=excerpt,
            label=label,
            verified=verified,
        )


@dataclass
class CitationStreamFilter:
    """Strip the trailing <citations> JSON block from streamed LLM output."""

    pending: str = ""
    in_citations: bool = False
    full_response: str = ""

    def feed(self, chunk: str) -> str:
        self.full_response += chunk
        if self.in_citations:
            return ""

        combined = self.pending + chunk
        if CITATIONS_START in combined:
            idx = combined.index(CITATIONS_START)
            self.in_citations = True
            self.pending = ""
            return combined[:idx]

        hold_back = 0
        for size in range(min(len(combined), len(CITATIONS_START) - 1), 0, -1):
            suffix = combined[-size:]
            if CITATIONS_START.startswith(suffix):
                hold_back = size
                break

        if hold_back:
            self.pending = combined[-hold_back:]
            return combined[:-hold_back]

        self.pending = ""
        return combined


def split_response_and_citations(full_response: str) -> tuple[str, str | None]:
    """Return display content and raw citations JSON if present."""
    start = full_response.find(CITATIONS_START)
    if start == -1:
        return full_response.strip(), None

    content = full_response[:start].strip()
    block = full_response[start + len(CITATIONS_START) :]
    end = block.find(CITATIONS_END)
    raw_json = block[:end].strip() if end != -1 else block.strip()
    return content, raw_json or None


def normalize_text(text: str) -> str:
    text = ftfy.fix_text(text, normalization="NFKC")
    text = text.replace("\u00ad", "")  # soft hyphen
    text = re.sub(r"[\u2010\u2011\u2012\u2013\u2014\u2212]", "-", text)
    return re.sub(r"\s+", " ", text).strip().lower()


def clean_excerpt(excerpt: str) -> str:
    cleaned = excerpt.strip().strip("\"'“”‘’")
    return cleaned


def get_page_text(extracted_text: str, page: int) -> str:
    if page < 1:
        return ""
    pattern = re.compile(
        rf"--- Page {page} ---\s*(.*?)(?=\s*--- Page \d+ ---|\Z)",
        re.DOTALL,
    )
    match = pattern.search(extracted_text)
    return match.group(1).strip() if match else ""


def verify_excerpt(excerpt: str, page_text: str) -> bool:
    excerpt = clean_excerpt(excerpt)
    if not excerpt.strip() or not page_text.strip():
        return False

    normalized_excerpt = normalize_text(excerpt)
    normalized_page = normalize_text(page_text)
    if normalized_excerpt in normalized_page:
        return True

    words = normalized_excerpt.split()
    if len(words) >= 3:
        snippet = " ".join(words[: min(16, len(words))])
        if snippet in normalized_page:
            return True

    return (
        max(
            fuzz.partial_ratio(normalized_excerpt, normalized_page),
            fuzz.token_set_ratio(normalized_excerpt, normalized_page),
        )
        >= FUZZY_MATCH_THRESHOLD
    )


def match_excerpt(excerpt: str, extracted_text: str, page_hint: int) -> tuple[bool, int]:
    """Check excerpt against document text, trying page_hint first then other pages."""
    excerpt = clean_excerpt(excerpt)
    if not excerpt or not extracted_text.strip():
        return False, page_hint

    pages = [int(match.group(1)) for match in PAGE_MARKER.finditer(extracted_text)]
    search_order = [page_hint] + [page for page in pages if page != page_hint]

    for page in search_order:
        if verify_excerpt(excerpt, get_page_text(extracted_text, page)):
            return True, page

    if verify_excerpt(excerpt, extracted_text):
        for page in pages:
            if verify_excerpt(excerpt, get_page_text(extracted_text, page)):
                return True, page
        return True, page_hint

    return False, page_hint


def resolve_document(filename: str, documents: list[Document]) -> Document | None:
    target = filename.strip().strip("\"'“”‘’")
    if not target:
        return documents[0] if len(documents) == 1 else None

    target_lower = target.lower()
    target_base = os.path.basename(target_lower)

    for doc in documents:
        doc_lower = doc.filename.lower()
        if doc_lower == target_lower or os.path.basename(doc_lower) == target_base:
            return doc

    if len(documents) == 1:
        only_doc = documents[0]
        doc_name = only_doc.filename.lower()
        if (
            max(
                fuzz.ratio(target_lower, doc_name),
                fuzz.partial_ratio(target_lower, doc_name),
                fuzz.token_set_ratio(target_lower, doc_name),
            )
            >= 68
        ):
            return only_doc

    scored = sorted(
        (
            (
                max(
                    fuzz.ratio(target_lower, doc.filename.lower()),
                    fuzz.partial_ratio(target_lower, doc.filename.lower()),
                    fuzz.token_set_ratio(target_lower, doc.filename.lower()),
                ),
                doc,
            )
            for doc in documents
        ),
        reverse=True,
        key=lambda item: item[0],
    )
    if not scored:
        return None

    best_score, best_doc = scored[0]
    if best_score < FILENAME_MATCH_THRESHOLD:
        return None
    if len(scored) > 1 and best_score - scored[1][0] < FILENAME_AMBIGUITY_GAP:
        return None
    return best_doc


def indicates_not_in_documents(content: str) -> bool:
    lowered = content.lower()
    if ABSTENTION_PHRASE.lower() in lowered:
        return True
    return any(re.search(pattern, lowered) for pattern in NOT_FOUND_PATTERNS)


def has_substantive_grounded_content(content: str) -> bool:
    """True when the answer includes supported facts, not just an abstention."""
    lowered = content.lower()
    phrase = ABSTENTION_PHRASE.lower()
    before = content[: lowered.index(phrase)].strip() if phrase in lowered else content.strip()

    if not before:
        return False
    if re.search(r"(?m)^\s*\*?\*?[123]\.", before):
        return True
    if re.search(r"\*\*[^*]+\*\*", before):
        return True
    if "£" in before or "€" in before or "$" in before:
        return len(before) > 80
    return len(before) > 250


def is_full_abstention(content: str) -> bool:
    stripped = content.strip()
    if not stripped:
        return True
    if has_substantive_grounded_content(stripped):
        return False
    return indicates_not_in_documents(stripped)


def compute_trust_level(citations: list[Citation], content: str) -> str:
    verified_count = sum(1 for citation in citations if citation.verified)
    total = len(citations)
    mentions_missing = indicates_not_in_documents(content)

    if total > 0 and verified_count > 0:
        if verified_count < total or mentions_missing:
            return "partial"
        return "high"

    if is_full_abstention(content):
        return "not_found"

    if mentions_missing and has_substantive_grounded_content(content):
        return "partial"

    return "unverified"


def build_verified_citations(
    raw_items: list[dict[str, Any]],
    documents: list[Document],
    content: str,
) -> tuple[list[Citation], str]:
    citations: list[Citation] = []

    for item in raw_items:
        page_hint = _parse_page(item.get("page", 1))
        doc = resolve_document(str(item.get("filename", "")).strip(), documents)
        extracted_text = doc.extracted_text or "" if doc else ""
        excerpt = str(item.get("excerpt", "")).strip()

        verified, page = (
            match_excerpt(excerpt, extracted_text, page_hint)
            if doc is not None and excerpt
            else (False, page_hint)
        )

        citations.append(Citation.from_raw_item(item, doc=doc, page=page, verified=verified))

    return citations, compute_trust_level(citations, content)


def process_response_citations(
    full_response: str,
    documents: list[Document],
) -> tuple[str, list[Citation], str]:
    """Parse, verify, and score citations from a completed LLM response."""
    content, raw_json = split_response_and_citations(full_response)
    return content, *build_verified_citations(_parse_json_list(raw_json), documents, content)


def citations_to_json(citations: list[Citation]) -> str:
    return json.dumps([citation.to_dict() for citation in citations])


def citations_from_json(raw: str | None) -> list[Citation]:
    return [
        Citation.from_raw_item(
            item,
            doc=None,
            page=_parse_page(item.get("page", 1)),
            verified=bool(item.get("verified", False)),
        )
        for item in _parse_json_list(raw)
    ]


def _parse_page(value: Any) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return 1


def _parse_json_list(raw: str | None) -> list[dict[str, Any]]:
    if not raw:
        return []

    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned)

    array_match = re.search(r"\[.*\]", cleaned, re.DOTALL)
    if array_match:
        cleaned = array_match.group(0)

    cleaned = re.sub(r",\s*]", "]", cleaned)
    cleaned = re.sub(r",\s*}", "}", cleaned)

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        return []
    if not isinstance(parsed, list):
        return []
    items: list[dict[str, Any]] = []
    for item in cast(list[Any], parsed):
        if isinstance(item, dict):
            items.append(cast(dict[str, Any], item))
    return items
