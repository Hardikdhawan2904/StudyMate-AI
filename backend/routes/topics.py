"""
POST /api/topics        — extract all topics + subtopics from a document
POST /api/explain-topic — brief explanation of one topic OR subtopic
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from services import rag_service
from services import llm_service
from vector_db.faiss_store import vector_store

router = APIRouter()


@router.post("/topics")
async def get_topics(body: Dict[str, Any]):
    doc_id = body.get("doc_id")
    if not doc_id:
        raise HTTPException(status_code=400, detail="doc_id is required.")
    if not vector_store.has_document(doc_id):
        raise HTTPException(status_code=404, detail=f"Document '{doc_id}' not found.")

    try:
        # Use sampled chunks so large docs get full coverage, not just the first 12k chars
        chunks = rag_service.get_document_chunks_sampled(doc_id, max_chars=40000)
        text   = "\n\n".join(chunks)
        result = llm_service.generate_topics(text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Topic extraction failed: {str(e)}")

    return {
        "doc_id":  doc_id,
        "content": result["content"],
        "topics":  result["topics"],
    }


@router.post("/explain-topic")
async def explain_topic(body: Dict[str, Any]):
    doc_id       = body.get("doc_id")
    title        = body.get("title", "")
    parent_topic = body.get("parent_topic")   # set when explaining a subtopic
    index        = body.get("index", 1)
    total        = body.get("total", 1)

    if not doc_id or not title:
        raise HTTPException(status_code=400, detail="doc_id and title are required.")
    if not vector_store.has_document(doc_id):
        raise HTTPException(status_code=404, detail=f"Document '{doc_id}' not found.")

    try:
        chunks      = rag_service.get_document_chunks_sampled(doc_id, max_chars=40000)
        text        = "\n\n".join(chunks)
        explanation = llm_service.generate_brief_item(text, title, parent_topic, index, total)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Explanation failed: {str(e)}")

    return {"answer": explanation}
