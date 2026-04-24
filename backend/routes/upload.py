"""
POST /api/upload
Accepts a file (PDF / DOCX / TXT), extracts text, chunks it,
generates embeddings, and stores them in the vector store (backed by the DB).
Document metadata is persisted to the database so it survives server restarts.
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Form, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel

from utils.helpers import generate_doc_id, allowed_file
from services import rag_service
from vector_db.faiss_store import vector_store
from database import get_db
from models import Document, DocumentChunk

router = APIRouter()


class UploadResponse(BaseModel):
    doc_id: str
    filename: str
    num_chunks: int
    message: str


@router.post("/upload", response_model=UploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    user_id: int = Form(0),
    db: Session = Depends(get_db),
):
    if not allowed_file(file.filename):
        raise HTTPException(status_code=400, detail="Unsupported file type. Please upload a PDF, DOCX, or TXT file.")

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(file_bytes) > 50 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File exceeds the 50 MB limit.")

    doc_id = generate_doc_id()

    try:
        num_chunks = rag_service.index_document(
            doc_id=doc_id,
            doc_name=file.filename,
            file_bytes=file_bytes,
            filename=file.filename,
            user_id=user_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

    # Persist document metadata to the database
    db_doc = Document(doc_id=doc_id, user_id=user_id, name=file.filename, num_chunks=num_chunks)
    db.add(db_doc)
    db.commit()

    return UploadResponse(
        doc_id=doc_id,
        filename=file.filename,
        num_chunks=num_chunks,
        message=f"Document indexed successfully with {num_chunks} chunks.",
    )


@router.get("/documents")
async def list_documents(user_id: int = 0, db: Session = Depends(get_db)):
    if not user_id:
        return {"documents": []}
    rows = db.query(Document).filter(Document.user_id == user_id).order_by(Document.created_at.desc()).all()
    return {"documents": [
        {"doc_id": r.doc_id, "name": r.name, "num_chunks": r.num_chunks}
        for r in rows
    ]}


@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str, db: Session = Depends(get_db)):
    # Remove chunks from the document_chunks table
    db.query(DocumentChunk).filter(DocumentChunk.doc_id == doc_id).delete()
    db.commit()

    # Remove from vector store memory cache (also deletes from document_chunks
    # via its own DB session, but that is idempotent and harmless)
    deleted = vector_store.delete_document(doc_id)

    # Remove the document metadata row
    db.query(Document).filter(Document.doc_id == doc_id).delete()
    db.commit()

    if not deleted:
        raise HTTPException(status_code=404, detail="Document not found.")
    return {"message": f"Document {doc_id} deleted successfully."}
