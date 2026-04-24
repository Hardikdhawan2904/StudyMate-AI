"""
Numpy Vector Store
Replaces FAISS with pure-numpy cosine similarity — no C++ deps, Vercel-compatible.
One .npy file per document for embeddings, one .json for chunks (same layout as before).
"""

import os
import json
import numpy as np
from typing import List, Dict, Tuple, Optional

DATA_DIR   = os.path.join(os.path.dirname(__file__), "..", "data")
INDEX_DIR  = os.path.join(DATA_DIR, "indexes")
CHUNKS_DIR = os.path.join(DATA_DIR, "chunks")

os.makedirs(INDEX_DIR,  exist_ok=True)
os.makedirs(CHUNKS_DIR, exist_ok=True)


def _cosine_scores(query: np.ndarray, matrix: np.ndarray) -> np.ndarray:
    q_norm = query / (np.linalg.norm(query) + 1e-10)
    norms  = np.linalg.norm(matrix, axis=1, keepdims=True) + 1e-10
    return (matrix / norms) @ q_norm


class FAISSVectorStore:
    """Drop-in replacement for the old FAISSVectorStore — identical public interface."""

    def __init__(self, embedding_dim: int = 768):
        self.embedding_dim = embedding_dim
        self._embeddings: Dict[str, np.ndarray] = {}
        self._chunks:     Dict[str, List[str]]  = {}
        self._doc_info:   Dict[str, dict]       = {}

    # ── Paths ──────────────────────────────────────────────────────────────────

    def _index_path(self, doc_id: str) -> str:
        return os.path.join(INDEX_DIR, f"{doc_id}.npy")

    def _chunks_path(self, doc_id: str) -> str:
        return os.path.join(CHUNKS_DIR, f"{doc_id}.json")

    # ── Write ──────────────────────────────────────────────────────────────────

    def add_document(self, doc_id: str, doc_name: str, chunks: List[str], embeddings: np.ndarray) -> None:
        if embeddings.dtype != np.float32:
            embeddings = embeddings.astype(np.float32)

        self._embeddings[doc_id] = embeddings
        self._chunks[doc_id]     = chunks
        self._doc_info[doc_id]   = {"name": doc_name, "num_chunks": len(chunks)}

        np.save(self._index_path(doc_id), embeddings)
        with open(self._chunks_path(doc_id), "w", encoding="utf-8") as f:
            json.dump({"name": doc_name, "chunks": chunks}, f, ensure_ascii=False)

    def delete_document(self, doc_id: str) -> bool:
        if doc_id not in self._embeddings:
            return False
        del self._embeddings[doc_id]
        del self._chunks[doc_id]
        del self._doc_info[doc_id]
        for path in (self._index_path(doc_id), self._chunks_path(doc_id)):
            try:
                os.remove(path)
            except FileNotFoundError:
                pass
        return True

    # ── Load from disk on startup ──────────────────────────────────────────────

    def load_from_disk(self) -> None:
        for fname in os.listdir(CHUNKS_DIR):
            if not fname.endswith(".json"):
                continue
            doc_id      = fname[:-5]
            index_path  = self._index_path(doc_id)
            chunks_path = self._chunks_path(doc_id)
            if not os.path.exists(index_path):
                continue
            try:
                embeddings = np.load(index_path)
                with open(chunks_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                self._embeddings[doc_id] = embeddings
                self._chunks[doc_id]     = data["chunks"]
                self._doc_info[doc_id]   = {"name": data["name"], "num_chunks": len(data["chunks"])}
            except Exception:
                pass

    # ── Read ───────────────────────────────────────────────────────────────────

    def search(self, query_embedding: np.ndarray, k: int = 5, doc_id: Optional[str] = None) -> List[Tuple[str, float, str]]:
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


# Singleton
vector_store = FAISSVectorStore()
vector_store.load_from_disk()
