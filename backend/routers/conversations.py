from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from database import get_db
from models import ConversationMessage, Task
from schemas import (
    ChatMessageResponse,
    ChatRequest,
    ChatResponse,
    StructuredAction,
)
from services.gemini_service import gemini_service

router = APIRouter(prefix="/api/conversations", tags=["Conversations"])


@router.get("", response_model=List[ChatMessageResponse])
def get_conversation_history(
    session_id: str = Query("default", description="Conversation session ID"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """Retrieve chronologically ordered conversation history for a given session."""
    messages = (
        db.query(ConversationMessage)
        .filter(ConversationMessage.session_id == session_id)
        .order_by(ConversationMessage.created_at.asc())
        .limit(limit)
        .all()
    )
    return messages


@router.post("/chat", response_model=ChatResponse, status_code=status.HTTP_200_OK)
async def chat_with_assistant(
    request: ChatRequest,
    auto_create_tasks: bool = Query(True, description="Automatically persist extracted actions as tasks"),
    db: Session = Depends(get_db),
):
    """
    Send a message to the AI assistant.
    - Validates message input
    - Maintains conversation history in SQLite
    - Queries Gemini model or smart mock mode
    - Extracts structured tasks/notes and saves them to the task board
    """
    clean_message = request.message.strip()
    if not clean_message:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Message content cannot be empty or blank whitespace.",
        )

    if len(clean_message) > 4000:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Message exceeds maximum allowed length of 4000 characters.",
        )

    # 1. Fetch recent history for context
    history_records = (
        db.query(ConversationMessage)
        .filter(ConversationMessage.session_id == request.session_id)
        .order_by(ConversationMessage.created_at.desc())
        .limit(10)
        .all()
    )
    history_records.reverse()

    history_payload = [
        {"role": record.role, "content": record.content}
        for record in history_records
    ]

    # 2. Record user message in SQLite
    user_record = ConversationMessage(
        session_id=request.session_id,
        role="user",
        content=clean_message,
        is_mock=False,
    )
    db.add(user_record)
    db.commit()

    # 3. Generate response via Gemini or intelligent mock mode
    ai_result = await gemini_service.generate_response(
        user_message=clean_message,
        history=history_payload,
        custom_system_prompt=request.system_instruction,
    )

    # 4. Record assistant message in SQLite
    assistant_record = ConversationMessage(
        session_id=request.session_id,
        role="assistant",
        content=ai_result["message"],
        model_used=ai_result["model"],
        is_mock=ai_result["is_mock"],
    )
    db.add(assistant_record)

    # 5. Optionally create tasks in SQLite from structured actions
    structured_actions = []
    _VALID_ACTION_TYPES = {"task", "reminder", "calendar", "email", "note", "research", "general"}
    for action_data in ai_result.get("structured_actions", []):
        try:
            # Normalise action_type: coerce unknown values to "task" so Pydantic validation
            # never raises a ValidationError that would propagate as HTTP 500.
            if action_data.get("action_type") not in _VALID_ACTION_TYPES:
                action_data = {**action_data, "action_type": "task"}
            action = StructuredAction(**action_data)
            structured_actions.append(action)

            if auto_create_tasks and action.action_type in ["task", "reminder", "calendar", "email", "research"]:
                new_task = Task(
                    title=action.title,
                    detail=action.detail or clean_message,
                    category=action.category or "general",
                    status="queued",
                    priority="medium",
                )
                db.add(new_task)
        except Exception:
            continue

    db.commit()

    return ChatResponse(
        message=ai_result["message"],
        role="assistant",
        session_id=request.session_id,
        model=ai_result["model"],
        is_mock=ai_result["is_mock"],
        structured_actions=structured_actions,
        created_at=datetime.now(timezone.utc),
    )


@router.delete("", status_code=status.HTTP_200_OK)
def clear_conversation(
    session_id: str = Query("default"),
    db: Session = Depends(get_db),
):
    """Clear conversation history for a given session."""
    deleted_count = (
        db.query(ConversationMessage)
        .filter(ConversationMessage.session_id == session_id)
        .delete()
    )
    db.commit()
    return {"message": f"Cleared {deleted_count} messages for session '{session_id}'."}
