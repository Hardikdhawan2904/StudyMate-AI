"""
POST /api/flashcards
Generates flashcards — distributes cards proportionally across all sections
so long PDFs get full coverage rather than just the first few pages.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
from services import rag_service
from services import llm_service
from vector_db.faiss_store import vector_store

router = APIRouter()


class Flashcard(BaseModel):
    front: str
    back: str


class FlashcardsResponse(BaseModel):
    doc_id: str
    num_cards: int
    estimated_pages: int
    flashcards: List[Flashcard]


@router.post("/flashcards", response_model=FlashcardsResponse)
async def generate_flashcards(body: Dict[str, Any]):
    doc_id = body.get("doc_id")
    num_cards = min(int(body.get("num_cards", 10)), 30)

    if not doc_id:
        raise HTTPException(status_code=400, detail="doc_id is required.")
    if not vector_store.has_document(doc_id):
        raise HTTPException(status_code=404, detail=f"Document '{doc_id}' not found.")

    try:
        stats  = rag_service.get_document_stats(doc_id)
        chunks = rag_service.get_document_chunks_sampled(doc_id)
        cards_raw = llm_service.generate_flashcards(chunks, num_cards=num_cards)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Flashcard generation failed: {str(e)}")

    flashcards = [
        Flashcard(front=c.get("front", ""), back=c.get("back", ""))
        for c in cards_raw
        if c.get("front") and c.get("back")
    ]

    return FlashcardsResponse(
        doc_id=doc_id,
        num_cards=len(flashcards),
        estimated_pages=stats.get("estimated_pages", 0),
        flashcards=flashcards,
    )
