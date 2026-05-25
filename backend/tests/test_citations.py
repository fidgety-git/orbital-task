from __future__ import annotations

from takehome.services.citations import (
    CitationStreamFilter,
    _parse_json_list,
    get_page_text,
    indicates_not_in_documents,
    split_response_and_citations,
    verify_excerpt,
)


def test_split_response_and_citations_strips_block() -> None:
    response = (
        "The rent is £50,000 per annum.\n\n"
        "<citations>\n"
        '[{"filename": "Lease.pdf", "page": 2, "excerpt": "£50,000", "label": "Rent"}]\n'
        "</citations>"
    )

    content, raw_json = split_response_and_citations(response)

    assert content == "The rent is £50,000 per annum."
    assert raw_json is not None
    assert "Lease.pdf" in raw_json


def test_split_response_without_citations_returns_full_content() -> None:
    response = "No citations here."

    content, raw_json = split_response_and_citations(response)

    assert content == "No citations here."
    assert raw_json is None


def test_parse_json_list_rejects_invalid_payload() -> None:
    assert _parse_json_list(None) == []
    assert _parse_json_list("not json") == []
    assert _parse_json_list('{"filename": "A.pdf"}') == []


def test_parse_json_list_tolerates_fenced_json_and_trailing_commas() -> None:
    raw = (
        "```json\n"
        '[{"filename": "Lease.pdf", "page": 1, "excerpt": "Rent", "label": "Rent"},]\n'
        "```"
    )
    items = _parse_json_list(raw)
    assert len(items) == 1
    assert items[0]["filename"] == "Lease.pdf"


def test_get_page_text_reads_page_markers() -> None:
    extracted = (
        "--- Page 1 ---\n"
        "Intro text\n"
        "--- Page 2 ---\n"
        "The tenant shall pay £50,000 rent.\n"
        "--- Page 3 ---\n"
        "Other terms"
    )

    assert get_page_text(extracted, 2) == "The tenant shall pay £50,000 rent."


def test_verify_excerpt_matches_full_and_partial_snippet() -> None:
    page_text = "The tenant shall pay £50,000 rent per annum with quarterly payments."

    assert verify_excerpt("£50,000 rent per annum", page_text) is True
    assert verify_excerpt("£50,000 rent per annum with quarterly", page_text) is True
    assert verify_excerpt("entirely fabricated clause", page_text) is False


def test_indicates_not_in_documents_detects_abstention() -> None:
    assert indicates_not_in_documents(
        "This information is not found in the uploaded documents."
    )
    assert not indicates_not_in_documents("The rent is £50,000 per annum.")


def test_normalize_text_fixes_mojibake_and_curly_quotes() -> None:
    from takehome.services.citations import normalize_text

    assert normalize_text("Â£850,000") == "£850,000"
    assert normalize_text("\u201cSection 3.1\u201d") == '"section 3.1"'


def test_verify_excerpt_matches_en_dash_via_fuzzy() -> None:
    page_text = "The tenant shall pay rent \u2013 payable on quarter days."

    assert verify_excerpt("rent - payable", page_text)


def test_citation_stream_filter_hides_trailing_block() -> None:
    stream_filter = CitationStreamFilter()

    visible = stream_filter.feed("Answer text ")
    visible += stream_filter.feed("continues.\n<citations>\n[]")

    assert visible.rstrip() == "Answer text continues."
    assert stream_filter.in_citations is True


def test_citation_stream_filter_handles_split_opening_tag() -> None:
    stream_filter = CitationStreamFilter()

    visible = stream_filter.feed("Answer text continues.")
    visible += stream_filter.feed("<cit")
    assert visible == "Answer text continues."

    trailing = stream_filter.feed("ations>\n[]")
    assert trailing == ""
    assert stream_filter.in_citations is True


def test_citations_from_json_tolerates_invalid_page_values() -> None:
    from takehome.services.citations import citations_from_json

    raw = '[{"filename": "Lease.pdf", "page": "bad", "excerpt": "text", "label": "Rent"}]'
    citations = citations_from_json(raw)

    assert len(citations) == 1
    assert citations[0].page == 1


def test_resolve_document_matches_fuzzy_filename_for_single_document(make_document) -> None:
    from takehome.services.citations import build_verified_citations, resolve_document

    lease = make_document(
        "doc-1",
        "Commercial Lease - 123 High Street.pdf",
        extracted_text="--- Page 1 ---\nThe rent is £850,000 per annum.",
    )

    assert resolve_document("Commercial Lease.pdf", [lease]) is lease

    citations, trust = build_verified_citations(
        [
            {
                "filename": "Commercial Lease.pdf",
                "page": 1,
                "excerpt": "£850,000 per annum",
                "label": "Rent",
            }
        ],
        [lease],
        "The rent is £850,000 per annum.",
    )
    assert citations[0].verified is True
    assert trust == "high"


def test_resolve_document_requires_exact_filename_match(make_document) -> None:
    from takehome.services.citations import resolve_document

    lease = make_document("doc-1", "Lease.pdf")
    amendment = make_document("doc-2", "Lease Amendment.pdf")

    assert resolve_document("Lease.pdf", [lease, amendment]) is lease
    assert resolve_document("Lease Amendment.pdf", [lease, amendment]) is amendment
    assert resolve_document("Lease", [lease, amendment]) is None
