from __future__ import annotations

import os
import uuid

import fitz  # PyMuPDF  # pyright: ignore[reportMissingTypeStubs]
import structlog
from fastapi import UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from takehome.config import settings
from takehome.db.models import Document
from takehome.services.conversation import mark_conversation_updated
from takehome.services.document_errors import DuplicateFilenameError

logger = structlog.get_logger()


async def find_document_by_filename(
    session: AsyncSession, conversation_id: str, filename: str
) -> Document | None:
    """Find a document in the conversation by filename (case-insensitive)."""
    stmt = select(Document).where(
        Document.conversation_id == conversation_id,
        func.lower(Document.filename) == filename.lower(),
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def upload_document(
    session: AsyncSession,
    conversation_id: str,
    file: UploadFile,
    filename: str | None = None,
) -> Document:
    """Upload and process a PDF document for a conversation.

    Validates the file is a PDF, saves it to disk, extracts text using PyMuPDF,
    and stores metadata in the database.

    Raises ValueError if the file is not a PDF or exceeds the size limit.
    Raises DuplicateFilenameError if the display filename already exists in this conversation.
    """
    if file.content_type not in ("application/pdf", "application/x-pdf"):
        upload_name = filename or file.filename or ""
        if not upload_name.lower().endswith(".pdf"):
            raise ValueError("Only PDF files are supported.")

    content = await file.read()

    if len(content) > settings.max_upload_size:
        raise ValueError(
            f"File too large. Maximum size is {settings.max_upload_size // (1024 * 1024)}MB."
        )

    original_filename = (filename or file.filename or "document.pdf").strip()
    if not original_filename.lower().endswith(".pdf"):
        original_filename = f"{original_filename}.pdf"

    existing = await find_document_by_filename(session, conversation_id, original_filename)
    if existing is not None:
        raise DuplicateFilenameError(original_filename, existing.id)

    unique_name = f"{uuid.uuid4().hex}_{original_filename}"
    file_path = os.path.join(settings.upload_dir, unique_name)

    os.makedirs(settings.upload_dir, exist_ok=True)

    with open(file_path, "wb") as f:
        f.write(content)

    logger.info("Saved uploaded PDF", filename=original_filename, path=file_path, size=len(content))

    extracted_text = ""
    page_count = 0
    try:
        doc = fitz.open(file_path)
        page_count = len(doc)
        pages: list[str] = []
        for page_num in range(page_count):
            page = doc[page_num]
            text = str(page.get_text())  # pyright: ignore[reportUnknownMemberType, reportUnknownArgumentType]
            if text.strip():
                pages.append(f"--- Page {page_num + 1} ---\n{text}")
        extracted_text = "\n\n".join(pages)
        doc.close()
    except Exception:
        logger.exception("Failed to extract text from PDF", filename=original_filename)
        extracted_text = ""

    logger.info(
        "Extracted text from PDF",
        filename=original_filename,
        page_count=page_count,
        text_length=len(extracted_text),
    )

    document = Document(
        conversation_id=conversation_id,
        filename=original_filename,
        file_path=file_path,
        extracted_text=extracted_text if extracted_text else None,
        page_count=page_count,
    )
    session.add(document)
    await mark_conversation_updated(session, conversation_id)
    await session.commit()
    await session.refresh(document)
    return document


async def get_document(session: AsyncSession, document_id: str) -> Document | None:
    """Get a document by its ID."""
    stmt = select(Document).where(Document.id == document_id)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def get_documents_for_conversation(
    session: AsyncSession, conversation_id: str
) -> list[Document]:
    """Get all documents for a conversation, ordered by upload time."""
    stmt = (
        select(Document)
        .where(Document.conversation_id == conversation_id)
        .order_by(Document.uploaded_at.asc())
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())
