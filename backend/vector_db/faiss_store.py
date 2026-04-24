"""
Database-backed Vector Store
Replaces file-based numpy storage with PostgreSQL/SQLite persistence via SQLAlchemy.
All embeddings and chunks are stored in the document_chunks table.
In-memory cache is rebuilt at startup from the database and kept in sync on writes.
"""

import numpy as np
from typing import List, Dict, Tuple, Optional


EMBEDDING_DIM = 4096


def _cosine_scores(query: np.ndarray, matrix: np.ndarray) -> np.ndarray:
    q_norm = query / (np.linalg.norm(query) + 1e-10)
    norms  = np.linalg.norm(matrix, axis=1, keepdims=True) + 1e-10
    return (matrix / norms) @ q_norm


class FAISSVectorStore:
    """
    Drop-in replacement for the old file-based FAISSVectorStore.
    Persists all data to the relational database via the DocumentChunk model.
    Keeps an in-memory cache for fast similarity search.
    """

    def __init__(self, embedding_dim: int = EMBEDDING_DIM):
        self.embedding_dim = embedding_dim
        self._embeddings: Dict[str, np.ndarray] = {}
        self._chunks:     Dict[str, List[str]]  = {}
        self._doc_info:   Dict[str, dict]       = {}

    # ── DB helpers ─────────────────────────────────────────────────────────────

    def _get_session(self):
        """Create a raw SQLAlchemy session (not the FastAPI dependency)."""
        from database import SessionLocal
        return SessionLocal()

    def _rebuild_cache_from_rows(self, rows) -> None:
        """Populate in-memory cache from a list of DocumentChunk ORM rows."""
        bucket: Dict[str, List] = {}
        for row in rows:
            bucket.setdefault(row.doc_id, []).append(row)

        for doc_id, doc_rows in bucket.items():
            doc_rows.sort(key=lambda r: r.chunk_index)
            chunks = [r.chunk_text for r in doc_rows]
            # Each row stores a single chunk embedding as raw bytes
            vecs = [
                np.frombuffer(r.embedding, dtype=np.float32)
                for r in doc_rows
            ]
            embeddings = np.stack(vecs, axis=0)  # shape (n_chunks, embedding_dim)
            self._embeddings[doc_id] = embeddings
            self._chunks[doc_id]     = chunks
            self._doc_info[doc_id]   = {
                "name":       doc_rows[0].doc_id,   # fallback; overwritten below
                "num_chunks": len(chunks),
            }

    def load_from_db(self) -> None:
        """Load all persisted chunks from the database into the in-memory cache."""
        try:
            from models import DocumentChunk, Document
            db = self._get_session()
            try:
                chunk_rows = db.query(DocumentChunk).all()
                self._rebuild_cache_from_rows(chunk_rows)

                # Overlay correct document names from the documents table
                doc_rows = db.query(Document).all()
                for doc in doc_rows:
                    if doc.doc_id in self._doc_info:
                        self._doc_info[doc.doc_id]["name"] = doc.name
            finally:
                db.close()
        except Exception as e:
            # Never crash at import time — start with empty cache if DB is not ready
            print(f"[vector_store] Warning: could not load from DB at startup: {e}")

    def load_from_disk(self) -> None:
        """Kept for interface compatibility. Delegates to load_from_db."""
        self.load_from_db()

    # ── Write ──────────────────────────────────────────────────────────────────

    def add_document(
        self,
        doc_id: str,
        doc_name: str,
        chunks: List[str],
        embeddings: np.ndarray,
        user_id: int = 0,
    ) -> None:
        if embeddings.dtype != np.float32:
            embeddings = embeddings.astype(np.float32)

        # Persist to database
        try:
            from models import DocumentChunk
            db = self._get_session()
            try:
                # Remove stale rows for this doc_id so re-uploads are clean
                db.query(DocumentChunk).filter(DocumentChunk.doc_id == doc_id).delete()

                for idx, (chunk_text, vec) in enumerate(zip(chunks, embeddings)):
                    row = DocumentChunk(
                        doc_id      = doc_id,
                        user_id     = user_id,
                        chunk_index = idx,
                        chunk_text  = chunk_text,
                        embedding   = vec.tobytes(),
                    )
                    db.add(row)

                db.commit()
            except Exception:
                db.rollback()
                raise
            finally:
                db.close()
        except Exception as e:
            # Log but don't crash — still update memory cache so the session works
            print(f"[vector_store] Warning: DB write failed for doc_id={doc_id}: {e}")

        # Update in-memory cache
        self._embeddings[doc_id] = embeddings
        self._chunks[doc_id]     = chunks
        self._doc_info[doc_id]   = {"name": doc_name, "num_chunks": len(chunks)}

    def delete_document(self, doc_id: str) -> bool:
        if doc_id not in self._embeddings:
            return False

        # Remove from database
        try:
            from models import DocumentChunk
            db = self._get_session()
            try:
                db.query(DocumentChunk).filter(DocumentChunk.doc_id == doc_id).delete()
                db.commit()
            except Exception:
                db.rollback()
                raise
            finally:
                db.close()
        except Exception as e:
            print(f"[vector_store] Warning: DB delete failed for doc_id={doc_id}: {e}")

        # Remove from memory cache
        self._embeddings.pop(doc_id, None)
        self._chunks.pop(doc_id, None)
        self._doc_info.pop(doc_id, None)
        return True

    # ── Read ───────────────────────────────────────────────────────────────────

    def search(
        self,
        query_embedding: np.ndarray,
        k: int = 5,
        doc_id: Optional[str] = None,
    ) -> List[Tuple[str, float, str]]:
        query   = query_embedding.flatten().astype(np.float32)
        results: List[Tuple[str, float, str]] = []
        targets = [doc_id] if doc_id else list(self._embeddings.keys())

        for did in targets:
            if did not in self._embeddings:
                continue
            matrix = self._embeddings[did]
            chunks = self._chunks[did]
            scores = _cosine_scores(query, matrix)
            top_k  = min(k, len(chunks))
            top_indices = np.argsort(scores)[::-1][:top_k]
            for idx in top_indices:
                results.append((chunks[idx], float(scores[idx]), did))

        results.sort(key=lambda x: x[1], reverse=True)
        return results[:k]

    def has_document(self, doc_id: str) -> bool:
        return doc_id in self._embeddings

    def list_documents(self) -> List[dict]:
        return [{"doc_id": did, **info} for did, info in self._doc_info.items()]

    def get_document_info(self, doc_id: str) -> Optional[dict]:
        if doc_id not in self._doc_info:
            return None
        return {"doc_id": doc_id, **self._doc_info[doc_id]}

    def get_document_chunks(self, doc_id: str) -> List[str]:
        return self._chunks.get(doc_id, [])

    def total_documents(self) -> int:
        return len(self._embeddings)


# Singleton — load persisted data from DB at import time
vector_store = FAISSVectorStore()
vector_store.load_from_db()
