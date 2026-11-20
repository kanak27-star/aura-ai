from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from database import get_db
from models import Note, Task
from schemas import DictationRequest, DictationResponse, NoteResponse, TaskResponse
from services.task_parser import parse_dictation_to_items

router = APIRouter(prefix="/api/voice", tags=["Voice"])


@router.post("/dictate", response_model=DictationResponse, status_code=status.HTTP_201_CREATED)
def process_dictation(request: DictationRequest, db: Session = Depends(get_db)):
    """
    Process full speech dictation ("Say your day").
    Parses unstructured spoken thoughts into separate tasks and notes,
    persisting them into SQLite.
    """
    parsed = parse_dictation_to_items(request.text)

    created_tasks = []
    for item in parsed["tasks"]:
        task = Task(
            title=item["title"],
            detail=item["detail"],
            category=item["category"],
            priority=item["priority"],
            status="queued",
        )
        db.add(task)
        db.commit()
        db.refresh(task)
        created_tasks.append(task)

    created_notes = []
    for item in parsed["notes"]:
        note = Note(
            title=item["title"],
            content=item["content"],
            tags=item["tags"],
        )
        db.add(note)
        db.commit()
        db.refresh(note)
        created_notes.append(note)

    task_count = len(created_tasks)
    note_count = len(created_notes)

    summary_parts = []
    if task_count:
        summary_parts.append(f"{task_count} task{'s' if task_count > 1 else ''}")
    if note_count:
        summary_parts.append(f"{note_count} note{'s' if note_count > 1 else ''}")

    summary = f"Generated {' and '.join(summary_parts)}" if summary_parts else "Processed speech transcription"
    spoken = f"Handled! I've extracted {summary} and added them to your dashboard."

    return DictationResponse(
        raw_text=request.text,
        summary=summary,
        created_tasks=[TaskResponse.model_validate(t) for t in created_tasks],
        created_notes=[NoteResponse.model_validate(n) for n in created_notes],
        spoken_summary=spoken,
    )
