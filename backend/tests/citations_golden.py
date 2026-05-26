from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, cast

from takehome.db.models import Document
from takehome.services.citations import process_response_citations

GOLDEN_PATH = Path(__file__).resolve().parent / "fixtures" / "citations-trust.json"


@dataclass
class DocumentStub:
    id: str
    filename: str
    conversation_id: str = "golden-conv"
    extracted_text: str | None = None


def load_golden_dataset(path: Path = GOLDEN_PATH) -> dict[str, Any]:
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def build_documents(
    dataset: dict[str, Any],
    document_refs: list[str],
) -> list[DocumentStub]:
    catalog = dataset["documents"]
    documents: list[DocumentStub] = []

    for ref in document_refs:
        raw = catalog[ref]
        documents.append(
            DocumentStub(
                id=str(raw["id"]),
                filename=str(raw["filename"]),
                extracted_text=str(raw["extracted_text"]),
            )
        )

    return documents


def run_golden_case(case: dict[str, Any], dataset: dict[str, Any]) -> list[str]:
    documents = build_documents(dataset, case["document_refs"])
    expected = case["expected"]

    _, citations, trust_level = process_response_citations(
        case["response"], cast(list[Document], documents)
    )

    verified_count = sum(1 for citation in citations if citation.verified)
    failures: list[str] = []

    if trust_level != expected["trust_level"]:
        failures.append(f"trust_level expected {expected['trust_level']!r}, got {trust_level!r}")

    if verified_count != expected["verified_count"]:
        failures.append(
            f"verified_count expected {expected['verified_count']}, got {verified_count}"
        )

    if len(citations) != expected["citation_count"]:
        failures.append(
            f"citation_count expected {expected['citation_count']}, got {len(citations)}"
        )

    for index, expected_citation in enumerate(expected.get("citations", [])):
        if index >= len(citations):
            failures.append(f"citation[{index}] missing")
            continue

        actual = citations[index]

        if expected_citation.get("filename") and actual.filename != expected_citation["filename"]:
            failures.append(
                f"citation[{index}].filename expected "
                f"{expected_citation['filename']!r}, got {actual.filename!r}"
            )

        if "page" in expected_citation and actual.page != expected_citation["page"]:
            failures.append(
                f"citation[{index}].page expected {expected_citation['page']}, got {actual.page}"
            )

        if "verified" in expected_citation and actual.verified != expected_citation["verified"]:
            failures.append(
                f"citation[{index}].verified expected "
                f"{expected_citation['verified']}, got {actual.verified}"
            )

    return failures
