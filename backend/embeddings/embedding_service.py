import os
import numpy as np
from typing import List
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from dotenv import load_dotenv

load_dotenv()

_client = GoogleGenerativeAIEmbeddings(
    model="models/embedding-001",
    google_api_key=os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY", ""),
)

EMBED_DIM = 768


class EmbeddingService:
    def __init__(self):
        self.embedding_dim = EMBED_DIM

    def embed_text(self, text: str) -> np.ndarray:
        return np.array(_client.embed_query(text), dtype=np.float32)

    def embed_texts(self, texts: List[str], batch_size: int = 32) -> np.ndarray:
        results = []
        for i in range(0, len(texts), batch_size):
            batch = _client.embed_documents(texts[i : i + batch_size])
            results.extend(batch)
        return np.array(results, dtype=np.float32)


embedding_service = EmbeddingService()
