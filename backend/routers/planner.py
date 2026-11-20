"""
Daily Planner router — organises tasks by date and priority.

Endpoints:
  GET /api/planner/today   — tasks due today or with no due date, sorted by priority
  GET /api/planner/week    — tasks due within the next 7 days
  GET /api/planner/overdue — tasks with a past due date that are not done
"""
from datetime import date, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from models import Task
from schemas import TaskResponse

router = APIRouter(prefix="/api/planner", tags=["Planner"])

PRIORITY_ORDER = {"high": 0, "medium": 1, "low": 2}


def _priority_key(task: Task) -> int:
    return PRIORITY_ORDER.get(str(task.priority), 1)


def _active(query):
    """Filter to only non-done tasks."""
    return query.filter(Task.status != "done", Task.status != "failed")


@router.get("/today", response_model=List[TaskResponse])
def get_today_tasks(db: Session = Depends(get_db)):
    """
    Return tasks due today (due_date == today ISO string) plus tasks with no
    due date, sorted high → medium → low priority.
    """
    today_str = date.today().isoformat()
    query = _active(db.query(Task))
    tasks = query.all()

    # Include tasks without a due date OR due today
    filtered = [t for t in tasks if not t.due_date or t.due_date.startswith(today_str)]
    filtered.sort(key=_priority_key)
    return filtered


@router.get("/week", response_model=List[TaskResponse])
def get_week_tasks(db: Session = Depends(get_db)):
    """
    Return tasks due within the next 7 days, sorted by due_date then priority.
    Includes tasks with no due date.
    """
    today = date.today()
    end = today + timedelta(days=7)
    query = _active(db.query(Task))
    tasks = query.all()

    def in_range(t: Task) -> bool:
        if not t.due_date:
            return True
        try:
            d = date.fromisoformat(t.due_date[:10])
            return today <= d <= end
        except ValueError:
            return True

    filtered = [t for t in tasks if in_range(t)]
    filtered.sort(key=lambda t: (t.due_date or "9999", _priority_key(t)))
    return filtered


@router.get("/overdue", response_model=List[TaskResponse])
def get_overdue_tasks(db: Session = Depends(get_db)):
    """Return tasks with a due_date in the past that are not completed."""
    today_str = date.today().isoformat()
    query = _active(db.query(Task))
    tasks = query.filter(Task.due_date.isnot(None)).all()

    overdue = []
    for t in tasks:
        try:
            if t.due_date and t.due_date[:10] < today_str:
                overdue.append(t)
        except Exception:
            pass

    overdue.sort(key=lambda t: (t.due_date or "", _priority_key(t)))
    return overdue


@router.get("/priority", response_model=List[TaskResponse])
def get_by_priority(
    priority: Optional[str] = Query(None, description="low | medium | high"),
    db: Session = Depends(get_db),
):
    """Return active tasks filtered (optionally) by priority level."""
    query = _active(db.query(Task))
    if priority:
        query = query.filter(Task.priority == priority)
    tasks = query.all()
    tasks.sort(key=_priority_key)
    return tasks
