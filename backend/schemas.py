
from datetime import datetime
from typing import List, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field


class StructuredAction(BaseModel):
    action_type: Literal[
        "task", "reminder", "calendar", "email",
        "note", "research", "general"
    ] = "task"

    title: str = Field(..., min_length=1, max_length=255)
    detail: Optional[str] = None
    category: str = "general"

    priority: Literal["low", "medium", "high"] = "medium"

    due_date: Optional[str] = None
    due_time: Optional[str] = None

    recipient: Optional[str] = None
    subject: Optional[str] = None
    content: Optional[str] = None


class ChatRequest(BaseModel):
    message: str = Field(
        ...,
        min_length=1,
        max_length=4000,
        description="The user query or dictated voice transcription."
    )
    session_id: str = Field(
        default="default",
        max_length=100,
        description="Session identifier for conversation memory."
    )
    system_instruction: Optional[str] = Field(
        default=None,
        max_length=1000,
        description="Custom prompt override."
    )


class ChatResponse(BaseModel):
    message: str
    role: str = "assistant"
    session_id: str
    model: str
    is_mock: bool
    structured_actions: List[StructuredAction] = Field(default_factory=list)
    created_at: datetime


class ConversationMessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    session_id: str
    role: str
    content: str
    model_used: Optional[str] = None
    is_mock: bool = False
    created_at: datetime


ChatMessageResponse = ConversationMessageResponse


class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    detail: Optional[str] = None
    category: Literal[
        "research", "reminder", "calendar",
        "email", "note", "general"
    ] = "general"
    priority: Literal["low", "medium", "high"] = "medium"
    due_date: Optional[str] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=255
    )
    detail: Optional[str] = None
    category: Optional[Literal[
        "research", "reminder", "calendar",
        "email", "note", "general"
    ]] = None
    status: Optional[Literal[
        "queued", "in_progress", "done", "failed"
    ]] = None
    priority: Optional[Literal["low", "medium", "high"]] = None
    due_date: Optional[str] = None


class TaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    detail: Optional[str] = None
    category: str
    status: str
    priority: str
    due_date: Optional[str] = None
    created_at: datetime


class NoteCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    content: str = Field(..., min_length=1)
    tags: Optional[str] = "voice"


class NoteUpdate(BaseModel):
    title: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=255
    )
    content: Optional[str] = Field(default=None, min_length=1)
    tags: Optional[str] = None


class NoteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    content: str
    tags: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class DictationRequest(BaseModel):
    text: str = Field(
        ...,
        min_length=2,
        max_length=8000,
        description="Full dictated text to parse into tasks and notes."
    )
    session_id: str = "default"


class DictationResponse(BaseModel):
    raw_text: str
    summary: str
    created_tasks: List[TaskResponse]
    created_notes: List[NoteResponse]
    spoken_summary: str


class HealthResponse(BaseModel):
    status: str
    database: str
    model: str
    is_mock: bool
    version: str = "1.0.0"
    timestamp: datetime
