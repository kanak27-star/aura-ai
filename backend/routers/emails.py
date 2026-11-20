
from datetime import datetime
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from database import get_db
from models import EmailDraft


router = APIRouter(prefix="/api/emails", tags=["Emails"])


class EmailDraftCreate(BaseModel):
    recipient: str = Field(..., min_length=1, max_length=255)
    subject: str = Field(..., min_length=1, max_length=500)
    content: str = Field(..., min_length=1)


class EmailDraftResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    recipient: str
    subject: str
    content: str
    status: Literal["draft", "approved", "sent", "cancelled", "failed"]
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    sent_at: Optional[datetime] = None


@router.post(
    "/drafts",
    response_model=EmailDraftResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_email_draft(
    request: EmailDraftCreate,
    db: Session = Depends(get_db),
):
    """Create an email draft. This does not send an email."""

    draft = EmailDraft(
        recipient=request.recipient.strip(),
        subject=request.subject.strip(),
        content=request.content.strip(),
        status="draft",
    )

    db.add(draft)
    db.commit()
    db.refresh(draft)

    return draft


@router.get("/drafts", response_model=list[EmailDraftResponse])
def get_email_drafts(db: Session = Depends(get_db)):
    """List saved email drafts."""

    return (
        db.query(EmailDraft)
        .order_by(EmailDraft.created_at.desc())
        .all()
    )


@router.get("/drafts/{draft_id}", response_model=EmailDraftResponse)
def get_email_draft(
    draft_id: int,
    db: Session = Depends(get_db),
):
    """Get one email draft."""

    draft = db.query(EmailDraft).filter(
        EmailDraft.id == draft_id
    ).first()

    if not draft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email draft not found.",
        )

    return draft


@router.post("/drafts/{draft_id}/approve", response_model=EmailDraftResponse)
def approve_email_draft(
    draft_id: int,
    db: Session = Depends(get_db),
):
    """Mark a draft as approved. This does not send the email."""

    draft = db.query(EmailDraft).filter(
        EmailDraft.id == draft_id
    ).first()

    if not draft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email draft not found.",
        )

    if draft.status != "draft":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Only draft emails can be approved. Current status: {draft.status}",
        )

    draft.status = "approved"
    db.commit()
    db.refresh(draft)

    return draft


@router.post("/drafts/{draft_id}/cancel", response_model=EmailDraftResponse)
def cancel_email_draft(
    draft_id: int,
    db: Session = Depends(get_db),
):
    """Cancel a draft or approved email. This does not send anything."""

    draft = db.query(EmailDraft).filter(
        EmailDraft.id == draft_id
    ).first()

    if not draft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email draft not found.",
        )

    if draft.status not in {"draft", "approved"}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"This email cannot be cancelled. Current status: {draft.status}",
        )

    draft.status = "cancelled"
    db.commit()
    db.refresh(draft)

    return draft
