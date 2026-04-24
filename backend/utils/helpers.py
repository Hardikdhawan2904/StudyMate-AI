"""
Shared utility helpers.
"""

import uuid
import os


def generate_doc_id() -> str:
    """Generate a short unique document ID."""
    return uuid.uuid4().hex[:12]


def allowed_file(filename: str) -> bool:
    allowed = {"pdf", "docx", "txt"}
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    return ext in allowed


def format_file_size(num_bytes: int) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if num_bytes < 1024:
            return f"{num_bytes:.1f} {unit}"
        num_bytes /= 1024
    return f"{num_bytes:.1f} TB"
