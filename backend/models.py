from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, LargeBinary
from sqlalchemy.sql import func
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_verified = Column(Boolean, default=False)
    otp = Column(String, nullable=True)
    otp_expiry = Column(DateTime, nullable=True)
    reset_token = Column(String, nullable=True)
    reset_token_expiry = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class Document(Base):
    __tablename__ = "documents"

    doc_id     = Column(String, primary_key=True)
    user_id    = Column(Integer, nullable=False, index=True)
    name       = Column(String, nullable=False)
    num_chunks = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, server_default=func.now())


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id          = Column(Integer, primary_key=True, index=True)
    doc_id      = Column(String, nullable=False, index=True)
    user_id     = Column(Integer, nullable=False, index=True)
    chunk_index = Column(Integer, nullable=False)
    chunk_text  = Column(Text, nullable=False)
    embedding   = Column(LargeBinary, nullable=False)


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    doc_id = Column(String, nullable=True)
    title = Column(String, nullable=False, default="New Chat")
    created_at = Column(DateTime, server_default=func.now())


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, nullable=False, index=True)
    role = Column(String, nullable=False)
    content = Column(String, nullable=False)
    sources = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class FlashcardHistory(Base):
    __tablename__ = "flashcard_history"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, nullable=False, index=True)
    doc_id     = Column(String, nullable=True)
    doc_name   = Column(String, nullable=True)
    num_cards  = Column(Integer, nullable=False)
    cards_json = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class QuizHistory(Base):
    __tablename__ = "quiz_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    doc_id = Column(String, nullable=True)
    doc_name = Column(String, nullable=True)
    score = Column(Integer, nullable=False)
    total = Column(Integer, nullable=False)
    pct = Column(Integer, nullable=False)
    questions_json = Column(Text, nullable=True)
    answers_json = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
