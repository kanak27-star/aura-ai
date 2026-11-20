
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from database import init_db
from routers import (
    conversations,
    documents,
    emails,
    health,
    notes,
    planner,
    search,
    tasks,
    tools,
    voice,
)


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)

logger = logging.getLogger("aura.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database tables upon startup."""

    logger.info("Initializing SQLite database tables and FTS5 indexes...")
    init_db()
    logger.info("Aura Voice Assistant Backend ready.")

    yield

    logger.info("Shutting down Aura Voice Assistant Backend.")


app = FastAPI(
    title="Aura AI Voice Assistant Backend",
    description=(
        "Modular REST API and conversation engine powered by Gemini & SQLite. "
        "Supports voice conversation, task management, notes, daily planning, "
        "web research, tool calling, email drafts, and document Q&A via FTS5."
    ),
    version="1.1.0",
    lifespan=lifespan,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception(
        f"Unhandled error processing request: {request.url.path} - {exc}"
    )

    return JSONResponse(
        status_code=500,
        content={
            "detail": "An internal server error occurred. Please try again."
        },
    )


# Register API routers

app.include_router(health.router)
app.include_router(conversations.router)
app.include_router(tasks.router)
app.include_router(notes.router)
app.include_router(voice.router)
app.include_router(planner.router)
app.include_router(search.router)
app.include_router(tools.router)
app.include_router(documents.router)
app.include_router(emails.router)


@app.get("/")
def root():
    return {
        "name": "Aura AI Voice Assistant API",
        "status": "online",
        "version": "1.1.0",
        "docs": "/docs",
        "health": "/api/health",
        "endpoints": {
            "conversations": "/api/conversations",
            "tasks": "/api/tasks",
            "notes": "/api/notes",
            "planner": "/api/planner",
            "search": "/api/search",
            "tools": "/api/tools",
            "documents": "/api/documents",
            "voice": "/api/voice",
            "emails": "/api/emails",
        },
    }
