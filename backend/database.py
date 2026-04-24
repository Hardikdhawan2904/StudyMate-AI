import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.getenv("DATABASE_URL", "")

if not DATABASE_URL:
    # Local dev or Vercel without a hosted DB — use SQLite
    _path = "/tmp/studymate_auth.db" if os.getenv("VERCEL") else "./studymate_auth.db"
    DATABASE_URL = f"sqlite:///{_path}"

# Supabase / Render / Railway give postgresql:// — SQLAlchemy 2 needs the driver specified
if DATABASE_URL.startswith("postgresql://") or DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+pg8000://", 1)
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+pg8000://", 1)

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
