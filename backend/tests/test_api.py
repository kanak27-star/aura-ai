"""
Aura AI Voice Assistant — comprehensive automated test suite.
Run from the backend/ directory:  python -m pytest tests/ -v
"""
import pytest
from fastapi.testclient import TestClient
import sys
import os

# Ensure backend root is in sys.path so imports resolve
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app
from database import Base, engine


# ─── Fixtures ────────────────────────────────────────────────────────────────

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Create all tables (including FTS5) once for the test session."""
    from database import init_db
    init_db()
    yield


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


# ─── Health ───────────────────────────────────────────────────────────────────

def test_health_check(client):
    """Health check returns status and db connection."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["healthy", "degraded"]
    assert data["database"] == "connected"
    assert "version" in data
    assert "timestamp" in data


def test_root_endpoint(client):
    """Root lists all registered endpoint groups."""
    r = client.get("/")
    assert r.status_code == 200
    body = r.json()
    assert "endpoints" in body
    for key in ("conversations", "tasks", "notes", "planner", "search", "tools", "documents"):
        assert key in body["endpoints"]


# ─── Conversations ────────────────────────────────────────────────────────────

def test_conversation_chat_endpoint_mock_mode(client):
    """AI conversation endpoint works in offline mock mode."""
    payload = {
        "message": "Hello Aura! Remind me to review the quarterly report tomorrow at 10am.",
        "session_id": "test_session_1",
    }
    response = client.post("/api/conversations/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["role"] == "assistant"
    assert data["session_id"] == "test_session_1"
    assert len(data["message"]) > 0
    assert "model" in data
    assert "is_mock" in data
    assert isinstance(data["structured_actions"], list)


def test_conversation_validation_empty_message(client):
    """Message validation rejects blank text."""
    payload = {"message": "   ", "session_id": "test_session_1"}
    response = client.post("/api/conversations/chat", json=payload)
    assert response.status_code == 422


def test_conversation_history_and_clear(client):
    """Fetch and clear conversation session history."""
    session_id = "test_history_session"
    client.post("/api/conversations/chat", json={"message": "First message", "session_id": session_id})

    history_res = client.get(f"/api/conversations?session_id={session_id}")
    assert history_res.status_code == 200
    turns = history_res.json()
    assert len(turns) >= 2  # user + assistant

    del_res = client.delete(f"/api/conversations?session_id={session_id}")
    assert del_res.status_code == 200

    empty_history = client.get(f"/api/conversations?session_id={session_id}").json()
    assert len(empty_history) == 0


# ─── Tasks ────────────────────────────────────────────────────────────────────

def test_task_crud(client):
    """Task creation, list, update, and deletion."""
    create_res = client.post("/api/tasks", json={
        "title": "Prepare slide deck",
        "category": "calendar",
        "priority": "high",
        "detail": "Include metrics from Q3",
        "due_date": "2026-12-01",
    })
    assert create_res.status_code == 201
    task = create_res.json()
    task_id = task["id"]
    assert task["title"] == "Prepare slide deck"
    assert task["status"] == "queued"
    assert task["due_date"] == "2026-12-01"

    list_res = client.get("/api/tasks")
    assert list_res.status_code == 200
    assert any(t["id"] == task_id for t in list_res.json())

    update_res = client.patch(f"/api/tasks/{task_id}", json={"status": "done"})
    assert update_res.status_code == 200
    assert update_res.json()["status"] == "done"

    del_res = client.delete(f"/api/tasks/{task_id}")
    assert del_res.status_code == 200


def test_task_filter_by_status(client):
    """Task list can be filtered by status."""
    client.post("/api/tasks", json={"title": "Filter test task", "priority": "low"})
    r = client.get("/api/tasks?status=queued")
    assert r.status_code == 200
    for t in r.json():
        assert t["status"] == "queued"


def test_task_not_found(client):
    """Updating or deleting a non-existent task returns 404."""
    assert client.patch("/api/tasks/999999", json={"status": "done"}).status_code == 404
    assert client.delete("/api/tasks/999999").status_code == 404


# ─── Notes ───────────────────────────────────────────────────────────────────

def test_note_crud(client):
    """Note creation, search, and deletion."""
    create_res = client.post("/api/notes", json={
        "title": "Architecture Ideas",
        "content": "Use FastAPI with SQLite and WebSockets for real-time visualizer updates.",
        "tags": "architecture,tech",
    })
    assert create_res.status_code == 201
    note = create_res.json()
    note_id = note["id"]

    search_res = client.get("/api/notes?search=FastAPI")
    assert search_res.status_code == 200
    assert any(n["id"] == note_id for n in search_res.json())

    del_res = client.delete(f"/api/notes/{note_id}")
    assert del_res.status_code == 200


def test_note_update(client):
    """Note content can be updated via PATCH."""
    r = client.post("/api/notes", json={"title": "Update test", "content": "Original"})
    nid = r.json()["id"]
    up = client.patch(f"/api/notes/{nid}", json={"content": "Updated content"})
    assert up.status_code == 200
    assert up.json()["content"] == "Updated content"
    client.delete(f"/api/notes/{nid}")


# ─── Voice Dictation ─────────────────────────────────────────────────────────

def test_voice_dictation_processing(client):
    """Dictating a day plan parses multiple tasks into the system."""
    dictation_text = (
        "Email team with sprint recap. "
        "Schedule design sync at 3pm tomorrow. "
        "Research web audio api visualizer techniques. "
        "Note: Remember to renew domain name next week."
    )
    res = client.post("/api/voice/dictate", json={"text": dictation_text})
    assert res.status_code == 201
    data = res.json()
    assert len(data["created_tasks"]) >= 3
    assert len(data["created_notes"]) >= 1
    assert "spoken_summary" in data


# ─── Planner ─────────────────────────────────────────────────────────────────

def test_planner_today(client):
    """Planner today endpoint returns active tasks."""
    # Create a task with no due date (always appears in today)
    r = client.post("/api/tasks", json={"title": "Planner test task", "priority": "high"})
    assert r.status_code == 201
    task_id = r.json()["id"]

    today_res = client.get("/api/planner/today")
    assert today_res.status_code == 200
    today_tasks = today_res.json()
    assert any(t["id"] == task_id for t in today_tasks)

    # Clean up
    client.patch(f"/api/tasks/{task_id}", json={"status": "done"})


def test_planner_overdue(client):
    """Overdue endpoint returns tasks with past due dates."""
    r = client.post("/api/tasks", json={
        "title": "Overdue task",
        "priority": "high",
        "due_date": "2020-01-01",
    })
    task_id = r.json()["id"]

    overdue_res = client.get("/api/planner/overdue")
    assert overdue_res.status_code == 200
    assert any(t["id"] == task_id for t in overdue_res.json())
    client.delete(f"/api/tasks/{task_id}")


def test_planner_week(client):
    """Week planner returns active tasks."""
    r = client.get("/api/planner/week")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_planner_priority_filter(client):
    """Priority endpoint accepts optional filter."""
    r = client.get("/api/planner/priority?priority=high")
    assert r.status_code == 200
    for t in r.json():
        assert t["priority"] == "high"


# ─── Web Search ──────────────────────────────────────────────────────────────

def test_search_status(client):
    """Search status endpoint is reachable."""
    r = client.get("/api/search/status")
    assert r.status_code == 200
    body = r.json()
    assert "provider" in body
    assert "is_configured" in body


def test_search_no_key_returns_mock(client):
    """Without an API key, search returns is_mock=True with an explanation."""
    r = client.post("/api/search", json={"query": "Python async best practices"})
    assert r.status_code == 200
    data = r.json()
    assert "query" in data
    assert "results" in data
    # With no key configured, should be mock or have an error message
    if data["is_mock"]:
        assert data["error"] is not None
        assert len(data["results"]) == 0


def test_search_empty_query_rejected(client):
    """Empty search query is rejected with 422."""
    r = client.post("/api/search", json={"query": " "})
    assert r.status_code == 422


# ─── Tools ───────────────────────────────────────────────────────────────────

def test_tools_list(client):
    """Tool catalogue endpoint returns all tools."""
    r = client.get("/api/tools/list")
    assert r.status_code == 200
    body = r.json()
    assert "tools" in body
    for expected_tool in ("list_tasks", "create_task", "complete_task", "delete_task", "list_notes", "search_web"):
        assert expected_tool in body["tools"]


def test_tool_list_tasks(client):
    """list_tasks tool returns task data."""
    r = client.post("/api/tools/invoke", json={"tool": "list_tasks", "args": {}})
    assert r.status_code == 200
    body = r.json()
    assert body["success"] is True
    assert isinstance(body["data"], list)


def test_tool_create_and_complete_task(client):
    """create_task and complete_task tools work end-to-end."""
    r = client.post("/api/tools/invoke", json={
        "tool": "create_task",
        "args": {"title": "Tool-created task", "priority": "high"},
    })
    assert r.status_code == 200
    task = r.json()["data"]
    task_id = task["id"]

    done_r = client.post("/api/tools/invoke", json={
        "tool": "complete_task",
        "args": {"task_id": task_id},
    })
    assert done_r.status_code == 200
    assert done_r.json()["data"]["status"] == "done"


def test_tool_delete_requires_confirmation(client):
    """delete_task is rejected without confirmed=true."""
    # First create a task via the tool
    r = client.post("/api/tools/invoke", json={
        "tool": "create_task",
        "args": {"title": "To be deleted"},
    })
    task_id = r.json()["data"]["id"]

    # Delete without confirmation — should be refused
    unconf = client.post("/api/tools/invoke", json={
        "tool": "delete_task",
        "args": {"task_id": task_id},
        "confirmed": False,
    })
    assert unconf.status_code == 200
    body = unconf.json()
    assert body["success"] is False
    assert body["requires_confirmation"] is True

    # Delete with confirmation — should succeed
    conf = client.post("/api/tools/invoke", json={
        "tool": "delete_task",
        "args": {"task_id": task_id},
        "confirmed": True,
    })
    assert conf.status_code == 200
    assert conf.json()["success"] is True


def test_tool_unknown_name_rejected(client):
    """Unknown tool name returns HTTP 400."""
    r = client.post("/api/tools/invoke", json={"tool": "launch_missiles", "args": {}})
    assert r.status_code == 400


# ─── Documents (FTS) ─────────────────────────────────────────────────────────

def test_document_crud_and_fts_search(client):
    """Document creation, retrieval, FTS search, and deletion."""
    create_res = client.post("/api/documents", json={
        "title": "Python Async Patterns",
        "content": (
            "Asyncio provides coroutines, tasks, and futures. "
            "Use async def and await to write non-blocking I/O code. "
            "FastAPI is built on top of Starlette and uses asyncio under the hood."
        ),
        "source": "internal",
        "tags": "python,async",
    })
    assert create_res.status_code == 201
    doc = create_res.json()
    doc_id = doc["id"]
    assert doc["title"] == "Python Async Patterns"

    # Fetch by ID
    get_res = client.get(f"/api/documents/{doc_id}")
    assert get_res.status_code == 200

    # List
    list_res = client.get("/api/documents")
    assert list_res.status_code == 200
    assert any(d["id"] == doc_id for d in list_res.json())

    # FTS search
    search_res = client.get("/api/documents/search?q=asyncio")
    assert search_res.status_code == 200
    results = search_res.json()
    assert any(r["id"] == doc_id for r in results)

    # Delete
    del_res = client.delete(f"/api/documents/{doc_id}")
    assert del_res.status_code == 200

    # Confirm gone
    assert client.get(f"/api/documents/{doc_id}").status_code == 404


def test_document_fts_search_empty_query(client):
    """FTS search requires at least 2 characters."""
    r = client.get("/api/documents/search?q=a")
    assert r.status_code == 422


# ─── Regression tests for the 500 bug ────────────────────────────────────────
# Root cause: task_parser emits category="general", which was used directly as
# action_type. StructuredAction.action_type is a Literal that did not include
# "general", so Pydantic raised ValidationError → HTTP 500.

def test_hello_returns_200_not_500(client):
    """
    Sending 'Hello, how are you?' must return HTTP 200 in mock mode.
    This is the exact message that triggered the 500 regression:
    task_parser produced action_type='general' which failed StructuredAction validation.
    """
    r = client.post(
        "/api/conversations/chat",
        json={"message": "Hello, how are you?", "session_id": "regression_hello"},
    )
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    body = r.json()
    assert body["role"] == "assistant"
    assert len(body["message"]) > 0
    assert body["is_mock"] is True
    assert isinstance(body["structured_actions"], list)


def test_general_category_action_type_is_coerced(client):
    """
    When task_parser emits category='general', the action must NOT cause a
    ValidationError. The resulting action's action_type must be a valid value
    (i.e., not 'general' which was previously rejected by the Literal schema).
    """
    r = client.post(
        "/api/conversations/chat",
        json={"message": "Just checking in.", "session_id": "regression_general"},
    )
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    body = r.json()
    valid_types = {"task", "reminder", "calendar", "email", "note", "research", "general"}
    for action in body["structured_actions"]:
        assert action["action_type"] in valid_types, (
            f"Invalid action_type '{action['action_type']}' would have caused a 500"
        )


def test_mock_mode_structured_action_schema(client):
    """
    Mock response structured_actions must all be valid StructuredAction instances.
    Tests a message likely to trigger heuristic task extraction.
    """
    r = client.post(
        "/api/conversations/chat",
        json={
            "message": "Remind me to send the invoice and research FastAPI deployment.",
            "session_id": "regression_schema",
        },
    )
    assert r.status_code == 200
    body = r.json()
    valid_types = {"task", "reminder", "calendar", "email", "note", "research", "general"}
    for action in body["structured_actions"]:
        assert "action_type" in action
        assert "title" in action
        assert action["action_type"] in valid_types


def test_mock_mode_with_no_api_key_is_stable(client):
    """
    Full end-to-end stability test: with GEMINI_API_KEY unset (mock mode),
    sending varied messages must always return 200 and never raise an
    unhandled exception.
    """
    test_messages = [
        "Hello",
        "What can you do?",
        "Schedule a meeting with the team at 3pm tomorrow",
        "Email John the Q3 report",
        "Research Python async patterns",
        "Note: Remember to renew the domain",
        "Thank you for your help",
        "Just a random sentence without any keywords",
    ]
    for msg in test_messages:
        r = client.post(
            "/api/conversations/chat",
            json={"message": msg, "session_id": "regression_stability"},
        )
        assert r.status_code == 200, (
            f"Message '{msg}' returned {r.status_code}: {r.text}"
        )
        body = r.json()
        assert body["role"] == "assistant"
        assert body["is_mock"] is True
