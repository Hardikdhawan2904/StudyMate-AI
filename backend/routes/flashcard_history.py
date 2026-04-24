from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import json

from database import get_db
from models import FlashcardHistory

router = APIRouter(prefix="/flashcard-history", tags=["Flashcard History"])


class SaveFlashcardRequest(BaseModel):
    user_id: int
    doc_id: Optional[str] = None
    doc_name: Optional[str] = "Document"
    num_cards: int
    cards: List[Dict[str, Any]]


@router.post("")
def save_deck(req: SaveFlashcardRequest, db: Session = Depends(get_db)):
    entry = FlashcardHistory(
        user_id=req.user_id,
        doc_id=req.doc_id,
        doc_name=req.doc_name,
        num_cards=req.num_cards,
        cards_json=json.dumps(req.cards),
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return {"id": entry.id}


@router.get("")
def get_history(user_id: int, db: Session = Depends(get_db)):
    rows = (
        db.query(FlashcardHistory)
        .filter(FlashcardHistory.user_id == user_id)
        .order_by(FlashcardHistory.created_at.desc())
        .limit(30)
        .all()
    )
    return [
        {
            "id": r.id,
            "date": str(r.created_at),
            "docId": r.doc_id,
            "docName": r.doc_name,
            "numCards": r.num_cards,
            "cards": json.loads(r.cards_json) if r.cards_json else [],
        }
        for r in rows
    ]


@router.delete("")
def clear_history(user_id: int, db: Session = Depends(get_db)):
    db.query(FlashcardHistory).filter(FlashcardHistory.user_id == user_id).delete()
    db.commit()
    return {"ok": True}
