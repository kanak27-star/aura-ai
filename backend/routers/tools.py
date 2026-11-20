"""
Tool-calling router — lets the AI (or the user) invoke validated backend functions.

Consequential actions (delete_task, clear_history) require confirmed=True in the
request body to prevent accidental execution.

Supported tools:
  list_tasks        — read current task list
  create_task       — add a task
  complete_task     — mark task done
  delete_task       — delete task (REQUIRES confirmed=true)
  list_notes        — read notes (with optional search)
  create_note       — save a note
  search_web        — perform web search
  get_planner_today — today's task list

POST /api/tools/invoke
GET  /api/tools/list
"""
import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from models import Note, Task
from schemas import TaskResponse, NoteResponse
from services.search_service import search_service

logger = logging.getLogger("aura.tools")
router = APIRouter(prefix="/api/tools", tags=["Tools"])

# ─── Schemas ────────────────────────────────────────────────────────────────

class ToolRequest(BaseModel):
    tool: str = Field(..., description="Tool name to invoke (see GET /api/tools/list)")
    args: Dict[str, Any] = Field(default_factory=dict, description="Tool arguments")
    confirmed: bool = Field(
        default=False,
        description="Must be True for consequential (destructive) tools."
    )


class ToolResult(BaseModel):
    tool: str
    success: bool
    data: Any = None
    error: Optional[str] = None
    requires_confirmation: bool = False


# ─── Tool implementations ────────────────────────────────────────────────────

PRIORITY_ORDER = {"high": 0, "medium": 1, "low": 2}

CONSEQUENTIAL_TOOLS = {"delete_task", "clear_all_tasks", "clear_all_notes"}

TOOL_SPECS = {
    "list_tasks": {
        "description": "List tasks, optionally filtered by status or category.",
        "args": {"status": "optional str", "category": "optional str"},
        "consequential": False,
    },
    "create_task": {
        "description": "Create a new task.",
        "args": {"title": "str (required)", "detail": "optional str",
                 "category": "optional str", "priority": "optional str",
                 "due_date": "optional ISO date str"},
        "consequential": False,
    },
    "complete_task": {
        "description": "Mark a task as done by its integer ID.",
        "args": {"task_id": "int (required)"},
        "consequential": False,
    },
    "delete_task": {
        "description": "Permanently delete a task. Requires confirmed=true.",
        "args": {"task_id": "int (required)"},
        "consequential": True,
    },
    "list_notes": {
        "description": "List notes with optional full-text search.",
        "args": {"search": "optional str", "tag": "optional str"},
        "consequential": False,
    },
    "create_note": {
        "description": "Save a note.",
        "args": {"title": "str (required)", "content": "str (required)",
                 "tags": "optional comma-separated str"},
        "consequential": False,
    },
    "search_web": {
        "description": "Perform a web search via the configured provider.",
        "args": {"query": "str (required)", "max_results": "optional int (default 5)"},
        "consequential": False,
    },
    "get_planner_today": {
        "description": "Return today's active tasks sorted by priority.",
        "args": {},
        "consequential": False,
    },
}


def _task_to_dict(t: Task) -> Dict:
    return {
        "id": t.id, "title": t.title, "status": t.status,
        "priority": t.priority, "category": t.category,
        "due_date": t.due_date, "detail": t.detail,
    }


def _note_to_dict(n: Note) -> Dict:
    return {
        "id": n.id, "title": n.title, "content": n.content,
        "tags": n.tags, "created_at": str(n.created_at),
    }


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.get("/list")
def list_tools():
    """Returns the full catalogue of available tools with their argument signatures."""
    return {"tools": TOOL_SPECS}


@router.post("/invoke", response_model=ToolResult, status_code=status.HTTP_200_OK)
async def invoke_tool(req: ToolRequest, db: Session = Depends(get_db)):
    """
    Invoke a named tool with validated arguments.
    Consequential tools require confirmed=True or the call is rejected.
    """
    tool = req.tool.strip()

    if tool not in TOOL_SPECS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown tool '{tool}'. Call GET /api/tools/list for the catalogue.",
        )

    if TOOL_SPECS[tool]["consequential"] and not req.confirmed:
        return ToolResult(
            tool=tool,
            success=False,
            requires_confirmation=True,
            error=(
                f"'{tool}' is a consequential action. "
                "Set confirmed=true in your request to proceed."
            ),
        )

    try:
        data = await _dispatch(tool, req.args, db)
        return ToolResult(tool=tool, success=True, data=data)
    except HTTPException as he:
        return ToolResult(tool=tool, success=False, error=he.detail)
    except Exception as exc:
        logger.exception(f"Tool '{tool}' raised an unexpected error: {exc}")
        return ToolResult(tool=tool, success=False, error=str(exc))


# ─── Dispatcher ──────────────────────────────────────────────────────────────

async def _dispatch(tool: str, args: Dict, db: Session) -> Any:
    if tool == "list_tasks":
        q = db.query(Task)
        if s := args.get("status"):
            q = q.filter(Task.status == s)
        if c := args.get("category"):
            q = q.filter(Task.category == c)
        return [_task_to_dict(t) for t in q.order_by(Task.created_at.desc()).all()]

    if tool == "create_task":
        title = str(args.get("title", "")).strip()
        if not title:
            raise HTTPException(status_code=400, detail="'title' is required.")
        t = Task(
            title=title,
            detail=args.get("detail"),
            category=args.get("category", "general"),
            priority=args.get("priority", "medium"),
            due_date=args.get("due_date"),
            status="queued",
        )
        db.add(t); db.commit(); db.refresh(t)
        return _task_to_dict(t)

    if tool == "complete_task":
        tid = int(args.get("task_id", 0))
        t = db.query(Task).filter(Task.id == tid).first()
        if not t:
            raise HTTPException(status_code=404, detail=f"Task {tid} not found.")
        t.status = "done"
        db.commit(); db.refresh(t)
        return _task_to_dict(t)

    if tool == "delete_task":
        tid = int(args.get("task_id", 0))
        t = db.query(Task).filter(Task.id == tid).first()
        if not t:
            raise HTTPException(status_code=404, detail=f"Task {tid} not found.")
        db.delete(t); db.commit()
        return {"deleted_id": tid}

    if tool == "list_notes":
        q = db.query(Note)
        if search := args.get("search"):
            q = q.filter(
                Note.title.ilike(f"%{search}%") | Note.content.ilike(f"%{search}%")
            )
        if tag := args.get("tag"):
            q = q.filter(Note.tags.ilike(f"%{tag}%"))
        return [_note_to_dict(n) for n in q.order_by(Note.updated_at.desc()).all()]

    if tool == "create_note":
        title = str(args.get("title", "")).strip()
        content = str(args.get("content", "")).strip()
        if not title or not content:
            raise HTTPException(status_code=400, detail="'title' and 'content' are required.")
        n = Note(title=title, content=content, tags=args.get("tags", "ai-tool"))
        db.add(n); db.commit(); db.refresh(n)
        return _note_to_dict(n)

    if tool == "search_web":
        query = str(args.get("query", "")).strip()
        if not query:
            raise HTTPException(status_code=400, detail="'query' is required.")
        max_r = int(args.get("max_results", 5))
        return await search_service.search(query, max_r)

    if tool == "get_planner_today":
        from datetime import date
        today_str = date.today().isoformat()
        tasks = db.query(Task).filter(
            Task.status != "done", Task.status != "failed"
        ).all()
        PRIO = {"high": 0, "medium": 1, "low": 2}
        filtered = [t for t in tasks if not t.due_date or t.due_date.startswith(today_str)]
        filtered.sort(key=lambda t: PRIO.get(str(t.priority), 1))
        return [_task_to_dict(t) for t in filtered]

    raise HTTPException(status_code=400, detail=f"Tool '{tool}' has no implementation.")
