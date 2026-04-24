"""
RAG Service
Orchestrates the full Retrieval-Augmented Generation pipeline.
Handles arbitrarily long documents via smart chunk sampling.
"""

import math
from typing import Optional, List, Tuple
from services.file_processor import process_file
from services.text_splitter import split_text
from embeddings.embedding_service import embedding_service
from vector_db.faiss_store import vector_store
from services import llm_service


def index_document(
    doc_id: str,
    doc_name: str,
    file_bytes: bytes,
    filename: str,
    user_id: int = 0,
) -> int:
    """
    Full pipeline: extract text -> chunk -> embed -> store in vector DB.
    Returns the number of chunks indexed.
    """
    text = process_file(filename, file_bytes)
    chunks = split_text(text)
    if not chunks:
        raise ValueError("No text chunks could be extracted from the document.")

    embeddings = embedding_service.embed_texts(chunks)
    vector_store.add_document(doc_id, doc_name, chunks, embeddings, user_id=user_id)
    return len(chunks)


def query_document(
    question: str,
    doc_id: Optional[str] = None,
    k: int = 8,
) -> Tuple[str, List[str]]:
    """
    RAG query: embed question -> search vector store -> build context -> ask LLM.
    Works correctly for all document sizes.
    """
    query_embedding = embedding_service.embed_text(question)
    results = vector_store.search(query_embedding, k=k, doc_id=doc_id)

    if not results:
        return ("No relevant content found. Please upload a document first.", [])

    source_chunks = [chunk for chunk, _dist, _did in results]
    context = "\n\n---\n\n".join(source_chunks)
    answer = llm_service.generate_answer(context, question)
    return answer, source_chunks


def get_document_chunks_sampled(doc_id: str, max_chars: int = 60_000) -> List[str]:
    """
    Return a representative sample of chunks from across the whole document.
    For short docs, returns all chunks.
    For long docs, picks chunks evenly spaced from beginning, middle, and end
    so that summary/quiz/flashcard generation covers the entire content.
    """
    all_chunks = vector_store.get_document_chunks(doc_id)
    if not all_chunks:
        raise ValueError(f"Document '{doc_id}' not found or has no content.")

    # Total chars across all chunks
    total_chars = sum(len(c) for c in all_chunks)

    if total_chars <= max_chars:
        return all_chunks  # Short doc — use everything

    # Estimate how many chunks fit within max_chars
    avg_chunk_len = total_chars / len(all_chunks)
    target_count = max(10, int(max_chars / avg_chunk_len))
    target_count = min(target_count, len(all_chunks))

    # Evenly space indices across the full chunk list so all parts are covered
    indices = [
        round(i * (len(all_chunks) - 1) / (target_count - 1))
        for i in range(target_count)
    ]
    # Remove duplicates while preserving order
    seen = set()
    sampled = []
    for idx in indices:
        if idx not in seen:
            seen.add(idx)
            sampled.append(all_chunks[idx])

    return sampled


def get_document_text(doc_id: str) -> str:
    """Return all chunks as a single text block (used for short docs / RAG context)."""
    chunks = vector_store.get_document_chunks(doc_id)
    if not chunks:
        raise ValueError(f"Document '{doc_id}' not found or has no content.")
    return "\n\n".join(chunks)


def get_document_stats(doc_id: str) -> dict:
    """Return stats about a document useful for deciding processing strategy."""
    chunks = vector_store.get_document_chunks(doc_id)
    if not chunks:
        raise ValueError(f"Document '{doc_id}' not found.")
    total_chars = sum(len(c) for c in chunks)
    estimated_pages = total_chars / 2500  # ~2500 chars per page
    return {
        "num_chunks": len(chunks),
        "total_chars": total_chars,
        "estimated_pages": round(estimated_pages),
        "is_long": total_chars > 30_000,
    }
