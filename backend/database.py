import logging
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()
logger = logging.getLogger("aura.database")

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./voice_assistant.db")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI database session dependency."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _init_fts5(connection):
    """
    Create the FTS5 virtual table for document full-text search.
    Uses content='' (contentless) with an external content table pattern —
    here we use a simple FTS5 table storing title + content directly.
    Safe to call multiple times (IF NOT EXISTS).
    """
    connection.execute(text(
        """
        CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts
        USING fts5(
            title,
            content,
            content='documents',
            content_rowid='id',
            tokenize='porter ascii'
        )
        """
    ))


def init_db():
    """
    Initialize all database tables and FTS5 virtual tables.
    Safe to call on every startup — SQLAlchemy uses CREATE TABLE IF NOT EXISTS
    semantics and FTS5 creation is explicitly guarded.
    """
    import models  # noqa: F401  — ensures all models are registered with Base
    Base.metadata.create_all(bind=engine)

    # Initialize FTS5 virtual table (not handled by SQLAlchemy ORM)
    with engine.connect() as conn:
        try:
            _init_fts5(conn)
            conn.commit()
            logger.info("SQLite FTS5 documents_fts table ready.")
        except Exception as exc:
            # FTS5 may not be available in all SQLite builds (rare)
            logger.warning(f"FTS5 init skipped (not available or already exists): {exc}")
