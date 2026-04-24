"""
Embedding Service — Hash-based TF vectorizer (no API, no ML deps).
Uses a hash trick to map tokens to a fixed-size vector. Fast and Vercel-safe.
"""

import re
import numpy as np
from typing import List

VOCAB_SIZE = 4096

_STOPWORDS = {
    "a","an","the","and","or","but","in","on","at","to","for","of","with",
    "is","it","its","be","are","was","were","as","by","from","that","this",
    "have","has","had","do","does","did","not","so","if","he","she","they",
    "we","you","i","my","your","our","their","his","her","will","would",
    "can","could","should","may","might","than","then","when","which","who",
}


def _vectorize(text: str) -> np.ndarray:
    tokens = re.findall(r"\b[a-z]{2,}\b", text.lower())
    tokens = [t for t in tokens if t not in _STOPWORDS]
    vec = np.zeros(VOCAB_SIZE, dtype=np.float32)
    counts: dict = {}
    for t in tokens:
        counts[t] = counts.get(t, 0) + 1
    for t, c in counts.items():
        vec[hash(t) % VOCAB_SIZE] += c
    total = vec.sum()
    if total > 0:
        vec /= total
    return vec


class EmbeddingService:
    def __init__(self):
        self.embedding_dim = VOCAB_SIZE

    def embed_text(self, text: str) -> np.ndarray:
        return _vectorize(text)

    def embed_texts(self, texts: List[str], batch_size: int = 32) -> np.ndarray:
        return np.stack([_vectorize(t) for t in texts])


embedding_service = EmbeddingService()
