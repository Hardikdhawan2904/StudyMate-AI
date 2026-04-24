"""
FAISS Vector Store
Manages one FAISS index per uploaded document for efficient semantic search.
Indexes and chunks are persisted to disk so they survive server restarts.
"""

import os
import json
import numpy as np
import faiss
from typing import List, Dict, Tuple, Optional

DATA_DIR   = os.path.join(os.path.dirname(__file__), "..", "data")
INDEX_DIR  = os.path.join(DATA_DIR, "indexes")
CHUNKS_DIR = os.path.join(DATA_DIR, "chunks")

os.makedirs(INDEX_DIR,  exist_ok=True)
os.makedirs(CHUNKS_DIR, exist_ok=True)


class FAISSVectorStore:
    def __init__(self, embedding_dim: int = 384):
        self.embedding_dim = embedding_dim
        self._indexes:  Dict[str, faiss.Index] = {}
        self._chunks:   Dict[str, List[str]]   = {}
        self._doc_info: Dict[str, dict]        = {}

    # ── Paths ──────────────────────────────────────────────────────────────────

    def _index_path(self, doc_id: str) -> str:
        return os.path.join(INDEX_DIR, f"{doc_id}.index")

    def _chunks_path(self, doc_id: str) -> str:
        return os.path.join(CHUNKS_DIR, f"{doc_id}.json")

    # ── Write ──────────────────────────────────────────────────────────────────

    def add_document(self, doc_id: str, doc_name: str, chunks: List[str], embeddings: np.ndarray) -> None:
        if embeddings.dtype != np.float32:
            embeddings = embeddings.astype(np.float32)

        index = faiss.IndexFlatL2(self.embedding_dim)
        index.add(embeddings)

        self._indexes[doc_id]  = index
        self._chunks[doc_id]   = chunks
        self._doc_info[doc_id] = {"name": doc_name, "num_chunks": len(chunks)}

        # Persist to disk
        faiss.write_index(index, self._index_path(doc_id))
        with open(self._chunks_path(doc_id), "w", encoding="utf-8") as f:
            json.dump({"name": doc_name, "chunks": chunks}, f, ensure_ascii=False)

    def delete_document(self, doc_id: str) -> bool:
        if doc_id not in self._indexes:
            return False
        del self._indexes[doc_id]
        del self._chunks[doc_id]
        del self._doc_info[doc_id]

        # Remove from disk
        try:
            os.remove(self._index_path(doc_id))
        except FileNotFoundError:
            pass
        try:
            os.remove(self._chunks_path(doc_id))
        except FileNotFoundError:
            pass
        return True

    # ── Load from disk on startup ──────────────────────────────────────────────

    def load_from_disk(self) -> None:
        """Load all previously saved indexes into memory."""
        for fname in os.listdir(CHUNKS_DIR):
            if not fname.endswith(".json"):
                continue
            doc_id = fname[:-5]
            index_path  = self._index_path(doc_id)
            chunks_path = self._chunks_path(doc_id)
            if not os.path.exists(index_path):
                continue
            try:
                index = faiss.read_index(index_path)
                with open(chunks_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                self._indexes[doc_id]  = index
                self._chunks[doc_id]   = data["chunks"]
                self._doc_info[doc_id] = {"name": data["name"], "num_chunks": len(data["chunks"])}
            except Exception:
                pass  # skip corrupted files

    # ── Read ───────────────────────────────────────────────────────────────────

    def search(self, query_embedding: np.ndarray, k: int = 5, doc_id: Optional[str] = None) -> List[Tuple[str, float, str]]:
        if query_embedding.dtype != np.float32:
            query_embedding = query_embedding.astype(np.float32)

        query_vec = query_embedding.reshape(1, -1)
        results: List[Tuple[str, float, str]] = []
        targets = [doc_id] if doc_id else list(self._indexes.keys())

        for did in targets:
            if did not in self._indexes:
                continue
            index  = self._indexes[did]
            chunks = self._chunks[did]
            actual_k = min(k, index.ntotal)
            if actual_k == 0:
                continue
            distances, indices = index.search(query_vec, actual_k)
            for dist, idx in zip(distances[0], indices[0]):
                if idx != -1:
                    results.append((chunks[idx], float(dist), did))

        results.sort(key=lambda x: x[1])
        return results[:k]

    def has_document(self, doc_id: str) -> bool:
        return doc_id in self._indexes

    def list_documents(self) -> List[dict]:
        return [{"doc_id": did, **info} for did, info in self._doc_info.items()]

    def get_document_info(self, doc_id: str) -> Optional[dict]:
        if doc_id not in self._doc_info:
            return None
        return {"doc_id": doc_id, **self._doc_info[doc_id]}

    def get_document_chunks(self, doc_id: str) -> List[str]:
        return self._chunks.get(doc_id, [])

    def total_documents(self) -> int:
        return len(self._indexes)


# Singleton — load persisted data immediately on import
vector_store = FAISSVectorStore()
vector_store.load_from_disk()
