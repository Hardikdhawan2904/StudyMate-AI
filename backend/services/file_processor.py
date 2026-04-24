"""
File Processor
Extracts plain text from PDF, DOCX, and TXT files.
"""

import io
from typing import Optional


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract all text from a PDF file using pypdf."""
    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(file_bytes))
    pages = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            pages.append(text.strip())
    return "\n\n".join(pages)


def extract_text_from_docx(file_bytes: bytes) -> str:
    """Extract all paragraph text from a DOCX file."""
    from docx import Document

    doc = Document(io.BytesIO(file_bytes))
    paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
    return "\n\n".join(paragraphs)


def extract_text_from_txt(file_bytes: bytes) -> str:
    """Decode a plain text file, trying UTF-8 then latin-1."""
    try:
        return file_bytes.decode("utf-8")
    except UnicodeDecodeError:
        return file_bytes.decode("latin-1")


def process_file(filename: str, file_bytes: bytes) -> str:
    """
    Dispatch to the right extractor based on file extension.
    Raises ValueError for unsupported types.
    """
    ext = filename.rsplit(".", 1)[-1].lower()

    if ext == "pdf":
        text = extract_text_from_pdf(file_bytes)
    elif ext == "docx":
        text = extract_text_from_docx(file_bytes)
    elif ext == "txt":
        text = extract_text_from_txt(file_bytes)
    else:
        raise ValueError(f"Unsupported file type: .{ext}. Use PDF, DOCX, or TXT.")

    if not text.strip():
        raise ValueError("No readable text found in the file.")

    return text
