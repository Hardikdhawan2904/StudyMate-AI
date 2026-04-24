"""
POST /api/summary
Generates a structured summary — uses Map-Reduce for long documents
so every page of a 100+ page PDF is covered.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
from services import rag_service
from services import llm_service
from vector_db.faiss_store import vector_store

router = APIRouter()


class TopicDetail(BaseModel):
    title: str
    explanation: str
    key_points: List[str]

class SummaryResponse(BaseModel):
    doc_id: str
    key_concepts: List[str]
    topics: List[TopicDetail]
    definitions: List[Dict[str, str]]
    exam_tips: List[str]
    estimated_pages: int
    strategy: str


@router.post("/summary", response_model=SummaryResponse)
async def generate_summary(body: Dict[str, Any]):
    doc_id = body.get("doc_id")
    if not doc_id:
        raise HTTPException(status_code=400, detail="doc_id is required.")
    if not vector_store.has_document(doc_id):
        raise HTTPException(status_code=404, detail=f"Document '{doc_id}' not found.")

    try:
        stats   = rag_service.get_document_stats(doc_id)
        # Use sampled chunks so large docs get content from every part, not just the start
        chunks  = rag_service.get_document_chunks_sampled(doc_id, max_chars=60000)
        text    = "\n\n".join(chunks)
        summary = llm_service.generate_summary(text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Summary generation failed: {str(e)}")

    return SummaryResponse(
        doc_id=doc_id,
        key_concepts=summary.get("key_concepts", []),
        topics=summary.get("topics", []),
        definitions=summary.get("definitions", []),
        exam_tips=summary.get("exam_tips", []),
        estimated_pages=stats.get("estimated_pages", 0),
        strategy=summary.get("_strategy", "direct"),
    )
