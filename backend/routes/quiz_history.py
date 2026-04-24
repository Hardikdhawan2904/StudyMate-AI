from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import json

from database import get_db
from models import QuizHistory

router = APIRouter(prefix="/quiz-history", tags=["Quiz History"])


class SaveQuizRequest(BaseModel):
    user_id: int
    doc_id: Optional[str] = None
    doc_name: Optional[str] = "Document"
    score: int
    total: int
    pct: int
    questions: Optional[List[Dict[str, Any]]] = []
    user_answers: Optional[Dict[str, Any]] = {}


@router.post("")
def save_quiz(req: SaveQuizRequest, db: Session = Depends(get_db)):
    entry = QuizHistory(
        user_id=req.user_id,
        doc_id=req.doc_id,
        doc_name=req.doc_name,
        score=req.score,
        total=req.total,
        pct=req.pct,
        questions_json=json.dumps(req.questions or []),
        answers_json=json.dumps(req.user_answers or {}),
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return {"id": entry.id}


@router.get("")
def get_history(user_id: int, db: Session = Depends(get_db)):
    rows = (
        db.query(QuizHistory)
        .filter(QuizHistory.user_id == user_id)
        .order_by(QuizHistory.created_at.desc())
        .limit(50)
        .all()
    )
    return [
        {
            "id": r.id,
            "date": str(r.created_at),
            "docId": r.doc_id,
            "docName": r.doc_name,
            "score": r.score,
            "total": r.total,
            "pct": r.pct,
            "questions": json.loads(r.questions_json) if r.questions_json else [],
            "userAnswers": json.loads(r.answers_json) if r.answers_json else {},
        }
        for r in rows
    ]


@router.delete("")
def clear_history(user_id: int, db: Session = Depends(get_db)):
    db.query(QuizHistory).filter(QuizHistory.user_id == user_id).delete()
    db.commit()
    return {"ok": True}
