import os
import re
import ssl
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.getenv("DATABASE_URL", "")

if not DATABASE_URL:
    _path = "/tmp/studymate_auth.db" if os.getenv("VERCEL") else "./studymate_auth.db"
    DATABASE_URL = f"sqlite:///{_path}"

connect_args = {}

if DATABASE_URL.startswith("postgresql://") or DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+pg8000://", 1)
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+pg8000://", 1)
    # pg8000 doesn't accept sslmode in the URL — strip it and pass ssl_context instead
    DATABASE_URL = re.sub(r"[?&]sslmode=\w+", "", DATABASE_URL)
    connect_args = {"ssl_context": ssl.create_default_context()}

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_recycle=300, connect_args=connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
