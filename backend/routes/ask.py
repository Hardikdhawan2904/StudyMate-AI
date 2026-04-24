"""
POST /api/ask
RAG question-answering: retrieves relevant chunks then queries the LLM.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from services import rag_service
from vector_db.faiss_store import vector_store

router = APIRouter()


class AskRequest(BaseModel):
    question: str
    doc_id: Optional[str] = None  # None = search all documents
    k: int = 15  # number of chunks to retrieve — more = richer context


class AskResponse(BaseModel):
    answer: str
    sources: List[str]
    doc_id: Optional[str]


@router.post("/ask", response_model=AskResponse)
async def ask_question(body: AskRequest):
    """
    Answer a question grounded in the uploaded study material.
    If doc_id is provided, search only that document; otherwise search all.
    If the specific doc_id is not available (deleted / not on this machine),
    fall back to searching across all available documents.
    """
    if not body.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    if vector_store.total_documents() == 0:
        raise HTTPException(
            status_code=400,
            detail="No documents uploaded yet. Please upload a study document first.",
        )

    # If a specific doc was requested but is not loaded, fall back to all docs
    effective_doc_id = body.doc_id
    if effective_doc_id and not vector_store.has_document(effective_doc_id):
        effective_doc_id = None  # search across all available documents

    try:
        answer, sources = rag_service.query_document(
            question=body.question,
            doc_id=effective_doc_id,
            k=body.k,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")

    return AskResponse(answer=answer, sources=sources, doc_id=effective_doc_id)
