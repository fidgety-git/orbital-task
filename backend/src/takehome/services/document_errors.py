from __future__ import annotations


class DuplicateFilenameError(Exception):
    """Raised when a conversation already contains a document with this filename."""

    def __init__(self, filename: str, existing_document_id: str) -> None:
        self.filename = filename
        self.existing_document_id = existing_document_id
        super().__init__(filename)
