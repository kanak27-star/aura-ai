"""
Web Research router — wraps SearchService and persists queries/results as notes.

POST /api/search          — perform a web search
GET  /api/search/history  — list previous search records
"""
import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from models import Note
from services.search_service import search_service

logger = logging.getLogger("aura.search_router")
router = APIRouter(prefix="/api/search", tags=["Search"])


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=500, description="Natural language search query")
    max_results: int = Field(default=5, ge=1, le=20)
    save_as_note: bool = Field(default=False, description="Persist result summary as a Note")


class SearchResult(BaseModel):
    title: str
    url: str
    snippet: str


class SearchResponse(BaseModel):
    query: str
    provider: str
    results: List[SearchResult]
    is_mock: bool
    error: Optional[str] = None
    note_id: Optional[int] = None


@router.post("", response_model=SearchResponse, status_code=status.HTTP_200_OK)
async def web_search(req: SearchRequest, db: Session = Depends(get_db)):
    """
    Execute a web search.  If no API key is configured the response will have
    is_mock=True and an explanation in the error field — no fabricated results.
    """
    raw = await search_service.search(req.query.strip(), req.max_results)

    note_id = None
    if req.save_as_note and not raw["is_mock"] and raw["results"]:
        lines = [f"**Search:** {req.query}\n"]
        for r in raw["results"]:
            lines.append(f"- [{r['title']}]({r['url']})\n  {r['snippet']}")
        note = Note(
            title=f"Research: {req.query[:80]}",
            content="\n".join(lines),
            tags="research,web-search",
        )
        db.add(note)
        db.commit()
        db.refresh(note)
        note_id = note.id
        logger.info(f"Search results saved as Note {note_id}")

    return SearchResponse(
        query=raw["query"],
        provider=raw["provider"],
        results=[SearchResult(**r) for r in raw.get("results", [])],
        is_mock=raw["is_mock"],
        error=raw.get("error"),
        note_id=note_id,
    )


@router.get("/status")
def search_status():
    """Returns the configured search provider and whether it is active."""
    return {
        "provider": search_service.provider_name,
        "is_configured": search_service.is_configured,
        "note": (
            "Configure SEARCH_PROVIDER and the matching API key in backend/.env to enable live search."
            if not search_service.is_configured
            else None
        ),
    }
