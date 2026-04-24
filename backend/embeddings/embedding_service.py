"""
Embedding Service
Uses Google's text-embedding-004 API — no local model, no PyTorch dependency.
"""

import os
import numpy as np
from typing import List
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY", ""))

_MODEL = "models/text-embedding-004"
EMBED_DIM = 768


class EmbeddingService:
    def __init__(self):
        self.embedding_dim = EMBED_DIM

    def embed_text(self, text: str, task_type: str = "retrieval_query") -> np.ndarray:
        result = genai.embed_content(model=_MODEL, content=text, task_type=task_type)
        return np.array(result["embedding"], dtype=np.float32)

    def embed_texts(self, texts: List[str], batch_size: int = 32) -> np.ndarray:
        embeddings = []
        for text in texts:
            result = genai.embed_content(
                model=_MODEL, content=text, task_type="retrieval_document"
            )
            embeddings.append(result["embedding"])
        return np.array(embeddings, dtype=np.float32)


embedding_service = EmbeddingService()
