"""
StudyMate AI – FastAPI Backend
Entry point: uvicorn main:app --reload
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from routes import upload, ask, summary, quiz, flashcards, topics
from routes import auth as auth_router
from routes import chat_history as chat_history_router
from routes import quiz_history as quiz_history_router
from routes import flashcard_history as flashcard_history_router
from routes import feedback as feedback_router
from database import engine, Base
import models  # ensure tables are registered

# Create all auth tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="StudyMate AI",
    description="AI-powered study assistant – upload notes and interact with them using RAG.",
    version="1.0.0",
)

# ── CORS ────────────────────────────────────────────────────────────────────
origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ───────────────────────────────────────────────────────────────────
app.include_router(auth_router.router, prefix="/api", tags=["Auth"])
app.include_router(upload.router,     prefix="/api", tags=["Upload"])
app.include_router(ask.router,        prefix="/api", tags=["Ask"])
app.include_router(summary.router,    prefix="/api", tags=["Summary"])
app.include_router(quiz.router,       prefix="/api", tags=["Quiz"])
app.include_router(flashcards.router,          prefix="/api", tags=["Flashcards"])
app.include_router(topics.router,             prefix="/api", tags=["Topics"])
app.include_router(chat_history_router.router, prefix="/api", tags=["Chat History"])
app.include_router(quiz_history_router.router, prefix="/api", tags=["Quiz History"])
app.include_router(flashcard_history_router.router, prefix="/api", tags=["Flashcard History"])
app.include_router(feedback_router.router,          prefix="/api", tags=["Feedback"])


# ── Health ───────────────────────────────────────────────────────────────────
@app.get("/", tags=["Health"])
async def root():
    return {
        "message": "StudyMate AI API is running",
        "docs": "/docs",
        "version": "1.0.0",
    }


@app.get("/health", tags=["Health"])
async def health():
    from vector_db.faiss_store import vector_store
    return {
        "status": "healthy",
        "documents_indexed": vector_store.total_documents(),
        "llm_provider": os.getenv("LLM_PROVIDER", "gemini"),
        "embedding_model": "text-embedding-004",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
