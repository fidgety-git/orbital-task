from __future__ import annotations

from takehome.services.document_errors import DuplicateFilenameError


def test_duplicate_filename_error_exposes_metadata() -> None:
    error = DuplicateFilenameError("Lease.pdf", "doc-1")

    assert error.filename == "Lease.pdf"
    assert error.existing_document_id == "doc-1"
    assert str(error) == "Lease.pdf"
