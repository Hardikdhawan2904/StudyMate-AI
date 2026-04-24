"""
Embedding Service
Uses sentence-transformers to convert text into dense vector embeddings.
"""

import os
import numpy as np
from typing import List
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv

load_dotenv()


class EmbeddingService:
    """Wraps a sentence-transformer model for text → vector conversion."""

    def __init__(self):
        model_name = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
        print(f"[EmbeddingService] Loading model: {model_name}")
        self._model = SentenceTransformer(model_name)
        # get_embedding_dimension() is the current API; the old name is deprecated
        self.embedding_dim = self._model.get_embedding_dimension()
        print(f"[EmbeddingService] Model loaded. Embedding dim: {self.embedding_dim}")

    def embed_text(self, text: str) -> np.ndarray:
        """Embed a single string. Returns shape (dim,)."""
        return self._model.encode(text, convert_to_numpy=True)

    def embed_texts(self, texts: List[str], batch_size: int = 32) -> np.ndarray:
        """
        Embed a list of strings. Returns shape (len(texts), dim).
        Batching keeps memory usage bounded for large document sets.
        """
        return self._model.encode(
            texts,
            batch_size=batch_size,
            convert_to_numpy=True,
            show_progress_bar=len(texts) > 50,
        )


# Singleton — loaded once at startup to avoid reloading the model on every request
embedding_service = EmbeddingService()
