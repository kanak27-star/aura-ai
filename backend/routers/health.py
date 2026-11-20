from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from database import get_db
from schemas import HealthResponse
from services.gemini_service import gemini_service

router = APIRouter(prefix="/api/health", tags=["Health"])


@router.get("", response_model=HealthResponse)
def get_health(db: Session = Depends(get_db)):
    """Health check endpoint validating server and SQLite database connection."""
    db_status = "connected"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    return HealthResponse(
        status="healthy" if db_status == "connected" else "degraded",
        database=db_status,
        model=gemini_service.model,
        is_mock=not gemini_service.is_configured,
        version="1.0.0",
        timestamp=datetime.now(timezone.utc),
    )
