from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
import json

from database import get_db
from models import ChatSession, ChatMessage

router = APIRouter(prefix="/chat", tags=["Chat History"])


class CreateSessionRequest(BaseModel):
    user_id: int
    doc_id: Optional[str] = None
    title: str = "New Chat"


class AddMessageRequest(BaseModel):
    role: str
    content: str
    sources: Optional[List[str]] = []


class UpdateTitleRequest(BaseModel):
    title: str


@router.post("/sessions")
def create_session(req: CreateSessionRequest, db: Session = Depends(get_db)):
    session = ChatSession(user_id=req.user_id, doc_id=req.doc_id, title=req.title[:80])
    db.add(session)
    db.commit()
    db.refresh(session)
    return {"session_id": session.id, "title": session.title}


@router.get("/sessions")
def list_sessions(user_id: int, db: Session = Depends(get_db)):
    sessions = (
        db.query(ChatSession)
        .filter(ChatSession.user_id == user_id)
        .order_by(ChatSession.created_at.desc())
        .limit(50)
        .all()
    )
    return [
        {"id": s.id, "title": s.title, "doc_id": s.doc_id, "created_at": s.created_at.isoformat() if s.created_at else ""}
        for s in sessions
    ]


@router.get("/sessions/{session_id}")
def get_session(session_id: int, user_id: int = 0, db: Session = Depends(get_db)):
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if user_id and session.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
        .all()
    )
    return {
        "id": session.id,
        "title": session.title,
        "doc_id": session.doc_id,
        "messages": [
            {
                "role": m.role,
                "content": m.content,
                "sources": json.loads(m.sources) if m.sources else [],
            }
            for m in messages
        ],
    }


@router.post("/sessions/{session_id}/messages")
def add_message(session_id: int, req: AddMessageRequest, db: Session = Depends(get_db)):
    msg = ChatMessage(
        session_id=session_id,
        role=req.role,
        content=req.content,
        sources=json.dumps(req.sources or []),
    )
    db.add(msg)
    db.commit()
    return {"ok": True}


@router.patch("/sessions/{session_id}/title")
def update_title(session_id: int, req: UpdateTitleRequest, db: Session = Depends(get_db)):
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session.title = req.title[:80]
    db.commit()
    return {"ok": True}


@router.delete("/sessions/{session_id}")
def delete_session(session_id: int, db: Session = Depends(get_db)):
    db.query(ChatMessage).filter(ChatMessage.session_id == session_id).delete()
    db.query(ChatSession).filter(ChatSession.id == session_id).delete()
    db.commit()
    return {"ok": True}
