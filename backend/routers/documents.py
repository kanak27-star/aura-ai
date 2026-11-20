"""
Document Q&A router — local document storage with SQLite FTS5 full-text search.

Documents are stored in the `documents` table.  A companion `documents_fts` FTS5
virtual table is created directly (SQLAlchemy does not model virtual tables).
Full-text search uses the SQLite FTS5 `MATCH` operator — no vector embeddings needed.

Endpoints:
  POST   /api/documents           — upload / save a document
  GET    /api/documents           — list all documents
  GET    /api/documents/{id}      — fetch one document
  DELETE /api/documents/{id}      — delete a document (and its FTS entry)
  GET    /api/documents/search    — full-text search across all documents
"""
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from database import get_db
from models import Document

logger = logging.getLogger("aura.documents")
router = APIRouter(prefix="/api/documents", tags=["Documents"])


# ─── Schemas ────────────────────────────────────────────────────────────────

class DocumentCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    content: str = Field(..., min_length=1, description="Full text of the document")
    source: Optional[str] = Field(None, max_length=500, description="URL, filename, or citation")
    tags: Optional[str] = Field(None, max_length=255)


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    content: str
    source: Optional[str] = None
    tags: Optional[str] = None
    created_at: str

    @classmethod
    def from_orm_safe(cls, doc: Document) -> "DocumentResponse":
        return cls(
            id=doc.id,
            title=doc.title,
            content=doc.content,
            source=doc.source,
            tags=doc.tags,
            created_at=str(doc.created_at),
        )


class DocumentSearchResult(BaseModel):
    id: int
    title: str
    snippet: str          # highlighted excerpt (best matching passage)
    source: Optional[str] = None
    tags: Optional[str] = None
    score: float = 0.0    # BM25 rank from FTS5 (lower = more relevant in SQLite)


# ─── Helpers ────────────────────────────────────────────────────────────────

def _ensure_fts_entry(db: Session, doc: Document) -> None:
    """Insert or replace the FTS5 entry for a document."""
    try:
        db.execute(
            text(
                "INSERT OR REPLACE INTO documents_fts(rowid, title, content) "
                "VALUES (:rowid, :title, :content)"
            ),
            {"rowid": doc.id, "title": doc.title, "content": doc.content},
        )
        db.commit()
    except Exception as exc:
        logger.warning(f"FTS insert failed for doc {doc.id}: {exc}")


def _remove_fts_entry(db: Session, doc_id: int) -> None:
    try:
        db.execute(
            text("DELETE FROM documents_fts WHERE rowid = :rid"),
            {"rid": doc_id},
        )
        db.commit()
    except Exception as exc:
        logger.warning(f"FTS delete failed for doc {doc_id}: {exc}")


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.post("", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
def create_document(doc_in: DocumentCreate, db: Session = Depends(get_db)):
    """Save a document and index it for full-text search."""
    doc = Document(
        title=doc_in.title.strip(),
        content=doc_in.content.strip(),
        source=doc_in.source,
        tags=doc_in.tags or "document",
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    _ensure_fts_entry(db, doc)
    return DocumentResponse.from_orm_safe(doc)


@router.get("", response_model=List[DocumentResponse])
def list_documents(
    tag: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """List all saved documents, optionally filtered by tag."""
    q = db.query(Document)
    if tag:
        q = q.filter(Document.tags.ilike(f"%{tag}%"))
    return [DocumentResponse.from_orm_safe(d) for d in q.order_by(Document.created_at.desc()).all()]


@router.get("/search", response_model=List[DocumentSearchResult])
def search_documents(
    q: str = Query(..., min_length=2, description="Full-text search query"),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """
    SQLite FTS5 full-text search across all document titles and content.
    Returns matching documents with a brief snippet.
    """
    try:
        rows = db.execute(
            text(
                "SELECT rowid, title, snippet(documents_fts, 1, '<b>', '</b>', '…', 30) AS snip, "
                "rank AS score "
                "FROM documents_fts "
                "WHERE documents_fts MATCH :query "
                "ORDER BY rank "
                "LIMIT :limit"
            ),
            {"query": q, "limit": limit},
        ).fetchall()
    except Exception as exc:
        logger.error(f"FTS search failed: {exc}")
        raise HTTPException(
            status_code=500,
            detail="Full-text search is temporarily unavailable. Please try again.",
        )

    results = []
    for row in rows:
        doc = db.query(Document).filter(Document.id == row[0]).first()
        results.append(DocumentSearchResult(
            id=row[0],
            title=row[1],
            snippet=row[2],
            source=doc.source if doc else None,
            tags=doc.tags if doc else None,
            score=float(row[3]),
        ))
    return results


@router.get("/{doc_id}", response_model=DocumentResponse)
def get_document(doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail=f"Document {doc_id} not found.")
    return DocumentResponse.from_orm_safe(doc)


@router.delete("/{doc_id}", status_code=status.HTTP_200_OK)
def delete_document(doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail=f"Document {doc_id} not found.")
    _remove_fts_entry(db, doc_id)
    db.delete(doc)
    db.commit()
    return {"message": f"Document {doc_id} deleted."}
