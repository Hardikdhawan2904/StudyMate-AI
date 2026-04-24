"""
Text Splitter
Splits large documents into overlapping chunks for embedding.
Overlap preserves context at chunk boundaries.
"""

import os
from typing import List, Optional
from dotenv import load_dotenv

load_dotenv()


def split_text(
    text: str,
    chunk_size: Optional[int] = None,
    chunk_overlap: Optional[int] = None,
) -> List[str]:
    """
    Split text into chunks of ~chunk_size characters with chunk_overlap
    characters of overlap between consecutive chunks.

    Strategy: split on sentence/paragraph boundaries where possible,
    then merge into chunks up to chunk_size.
    """
    chunk_size = chunk_size or int(os.getenv("CHUNK_SIZE", 1000))
    chunk_overlap = chunk_overlap or int(os.getenv("CHUNK_OVERLAP", 200))

    # Try separators from coarsest to finest
    separators = ["\n\n", "\n", ". ", "! ", "? ", " "]

    chunks: List[str] = []
    _recursive_split(text, separators, chunk_size, chunk_overlap, chunks)

    # Remove empty or whitespace-only chunks
    return [c.strip() for c in chunks if c.strip()]


def _recursive_split(
    text: str,
    separators: List[str],
    chunk_size: int,
    chunk_overlap: int,
    result: List[str],
) -> None:
    """Recursively split text using the first separator that yields manageable pieces."""
    if len(text) <= chunk_size:
        if text.strip():
            result.append(text)
        return

    for sep in separators:
        if sep in text:
            pieces = text.split(sep)
            _merge_pieces(pieces, sep, chunk_size, chunk_overlap, result)
            return

    # No separator found — hard-cut at chunk_size
    for i in range(0, len(text), chunk_size - chunk_overlap):
        result.append(text[i : i + chunk_size])


def _merge_pieces(
    pieces: List[str],
    sep: str,
    chunk_size: int,
    chunk_overlap: int,
    result: List[str],
) -> None:
    """Merge small pieces back into chunks of at most chunk_size."""
    current = ""
    overlap_buffer = ""

    for piece in pieces:
        candidate = (current + sep + piece).strip() if current else piece.strip()

        if len(candidate) <= chunk_size:
            current = candidate
        else:
            if current:
                result.append(current)
                overlap_buffer = current[-chunk_overlap:] if len(current) > chunk_overlap else current
            current = (overlap_buffer + sep + piece).strip() if overlap_buffer else piece.strip()
            overlap_buffer = ""

            # Hard-cut an oversized single piece
            if len(current) > chunk_size:
                for i in range(0, len(current), chunk_size - chunk_overlap):
                    result.append(current[i : i + chunk_size])
                current = ""

    if current:
        result.append(current)
