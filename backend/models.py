
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    Integer,
    String,
    Text,
    ForeignKey,
)
from database import Base


def utc_now():
    return datetime.now(timezone.utc)


class ConversationMessage(Base):
    __tablename__ = "conversation_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(100), index=True, default="default")
    role = Column(String(50), nullable=False)
    content = Column(Text, nullable=False)
    model_used = Column(String(100), nullable=True)
    is_mock = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utc_now)


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    detail = Column(Text, nullable=True)
    category = Column(String(50), default="general")
    status = Column(String(50), default="queued")
    priority = Column(String(20), default="medium")
    due_date = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=utc_now)


class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    tags = Column(String(255), default="voice")
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)


class AssistantProfile(Base):
    __tablename__ = "assistant_profile"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), default="Aura")
    avatar = Column(String(50), default="✦")
    vibe = Column(
        String(255),
        default="Thoughtful, concise, and proactive personal executive voice assistant"
    )
    instructions = Column(
        Text,
        default="Be concise, warm, and highly structured in spoken responses."
    )
    voice_accent = Column(String(50), default="en-US")
    speech_rate = Column(Float, default=1.0)
    created_at = Column(DateTime, default=utc_now)


class Document(Base):
    """Stores user-uploaded or pasted documents for local FTS-based Q&A."""

    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    source = Column(String(500), nullable=True)
    tags = Column(String(255), default="document")
    created_at = Column(DateTime, default=utc_now)


class EmailDraft(Base):
    """Stores email drafts awaiting user approval and sending."""

    __tablename__ = "email_drafts"

    id = Column(Integer, primary_key=True, index=True)

    recipient = Column(String(255), nullable=False)
    subject = Column(String(500), nullable=False)
    content = Column(Text, nullable=False)

    status = Column(
        String(30),
        default="draft",
        nullable=False
    )
    # draft, approved, sent, cancelled, failed

    error_message = Column(Text, nullable=True)

    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(
        DateTime,
        default=utc_now,
        onupdate=utc_now
    )
    sent_at = Column(DateTime, nullable=True)
