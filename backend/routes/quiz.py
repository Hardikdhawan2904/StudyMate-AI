"""
POST /api/quiz
Generates MCQ questions with varied focus each call so students
get different questions every time they generate a quiz.
"""

import random
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
from services import rag_service
from services import llm_service
from vector_db.faiss_store import vector_store

router = APIRouter()

_FOCUS_AREAS = [
    "introductory concepts and background",
    "key definitions and terminology",
    "core processes, methods, and procedures",
    "real-world applications and examples",
    "comparisons, differences, and trade-offs",
    "advanced technical details and specifications",
    "causes, effects, and relationships between concepts",
    "numerical data, formulas, and quantitative aspects",
    "advantages, disadvantages, and limitations",
    "historical context and development",
]


class QuizQuestion(BaseModel):
    question: str
    options: Dict[str, str]
    correct_answer: str
    explanation: str


class QuizResponse(BaseModel):
    doc_id: str
    num_questions: int
    estimated_pages: int
    questions: List[QuizQuestion]


@router.post("/quiz", response_model=QuizResponse)
async def generate_quiz(body: Dict[str, Any]):
    doc_id = body.get("doc_id")
    num_questions = min(int(body.get("num_questions", 5)), 15)
    seed = int(body.get("seed", random.randint(1000, 99999)))

    if not doc_id:
        raise HTTPException(status_code=400, detail="doc_id is required.")
    if not vector_store.has_document(doc_id):
        raise HTTPException(status_code=404, detail=f"Document '{doc_id}' not found.")

    random.seed(seed)
    focus = random.choice(_FOCUS_AREAS)
    random.seed(None)  # reset so other calls aren't affected

    try:
        stats  = rag_service.get_document_stats(doc_id)
        chunks = rag_service.get_document_chunks_sampled(doc_id)
        questions_raw = llm_service.generate_quiz(
            chunks, num_questions=num_questions, focus=focus, seed=seed
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Quiz generation failed: {str(e)}")

    questions = []
    for q in questions_raw:
        try:
            questions.append(QuizQuestion(
                question=q.get("question", ""),
                options=q.get("options", {}),
                correct_answer=q.get("correct_answer", ""),
                explanation=q.get("explanation", ""),
            ))
        except Exception:
            continue

    return QuizResponse(
        doc_id=doc_id,
        num_questions=len(questions),
        estimated_pages=stats.get("estimated_pages", 0),
        questions=questions,
    )
