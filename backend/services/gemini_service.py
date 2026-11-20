
import asyncio
import json
import logging
import os
import re
from typing import Any, Dict, List, Optional, Tuple

import httpx
from dotenv import load_dotenv

from services.task_parser import parse_dictation_to_items


load_dotenv()

logger = logging.getLogger("aura.gemini")
logging.getLogger("httpx").setLevel(logging.WARNING)


SYSTEM_VOICE_PROMPT = """
You are Aura, an executive personal voice assistant.

Your responsibilities:
- Have natural, friendly conversations.
- Help users organize their day and priorities.
- Identify reminders, tasks, calendar events, emails, notes and research requests.
- Give concise, useful answers.
- Never claim that an email was sent or an event was scheduled unless the application confirms it.
- Never claim that a reminder or task was saved unless the application confirms it.

For actionable requests, include a JSON block at the end of your response:

```actions
[
  {
    "action_type": "task",
    "title": "Short title",
    "detail": "Useful details",
    "category": "general"
  }
]
```

Valid action_type values:
task, reminder, calendar, email, note, research.

Valid category values:
email, calendar, reminder, research, note, general.

For email actions:
- Identify the recipient separately.
- Extract the subject separately when provided.
- Extract the message body separately when provided.
- Put the subject in the subject field.
- Put the message body in the content field.
- Preserve additional context in the detail field.
- Never combine the recipient and message content into the title.

For reminders:
- Extract the reminder title.
- Extract the time into due_time when provided.
- Extract the date into due_date when provided.

If the user is only greeting you, asking a question, or having a normal conversation,
respond naturally and DO NOT create an actions block.

Keep responses warm, clear and concise.
"""


class GeminiService:

    _CATEGORY_TO_ACTION_TYPE = {
        "task": "task",
        "reminder": "reminder",
        "calendar": "calendar",
        "email": "email",
        "note": "note",
        "research": "research",
        "general": "task",
    }

    # Fields that must survive every conversion in the backend.
    _ACTION_FIELDS = (
        "due_time",
        "due_date",
        "recipient",
        "priority",
        "subject",
        "content",
    )

    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY", "").strip()

        self.model = os.getenv(
            "GEMINI_MODEL",
            "gemini-3.8-flash"
        ).strip()

        self.model = self.model.removeprefix("models/")

        self.endpoint = (
            "https://generativelanguage.googleapis.com/"
            f"v1beta/models/{self.model}:generateContent"
        )

        self.max_retries = 3

    @property
    def is_configured(self) -> bool:
        return bool(
            self.api_key
            and self.api_key.lower()
            not in {"mock", "placeholder", "none"}
        )

    # --------------------------------------------------
    # GREETING DETECTION
    # --------------------------------------------------

    def _is_greeting(self, message: str) -> bool:
        text = message.lower().strip()

        text = re.sub(
            r"^(?:(?:hey|hi|hello)\s+)?"
            r"(?:aura|ora|laura)\b[\s,!?]*",
            "",
            text
        )

        text = re.sub(
            r"^(?:now|so|well)[\s,!?]+",
            "",
            text
        )

        text = text.strip()

        patterns = [
            r"^(hi|hello|hey)[!. ]*$",
            r"^(how are you|how are you doing)[?! .]*$",
            r"^(are you there|are you working)[?! .]*$",
            r"^(good morning|good afternoon|good evening)[!. ]*$",
            r"^(what's up|whats up)[?! .]*$",
        ]

        return any(
            re.fullmatch(pattern, text)
            for pattern in patterns
        )

    # --------------------------------------------------
    # CAPABILITY QUESTIONS
    # --------------------------------------------------

    def _is_capability_question(self, message: str) -> bool:
        text = message.lower().strip()

        patterns = [
            r"\bwhat can you do\b",
            r"\bwhat can you handle\b",
            r"\bwhat can you help\b",
            r"\bhow can you help\b",
            r"\byour capabilities\b",
            r"\bwhat are your features\b",
            r"\bwho are you\b",
            r"\bwhat is aura\b",
            r"\bwhat are you capable of\b",
        ]

        return any(
            re.search(pattern, text)
            for pattern in patterns
        )

    # --------------------------------------------------
    # GENERAL CONVERSATION
    # --------------------------------------------------

    def _conversation_response(self, user_message: str) -> str:

        if self._is_greeting(user_message):
            return (
                "I'm doing well, thank you! I'm Aura, your personal "
                "executive assistant. What can I help you with today?"
            )

        if self._is_capability_question(user_message):
            return (
                "I'm Aura, your executive voice assistant. I can help you "
                "manage reminders, organize tasks, plan calendar events, "
                "draft emails, save notes, summarize information and "
                "research topics. You can tell me several things at once, "
                "and I'll organize them for you."
            )

        return (
            "I'm temporarily unable to connect to my AI service. "
            "Please try again shortly."
        )

    # --------------------------------------------------
    # ACTION DETECTION
    # --------------------------------------------------

    def _looks_actionable(self, message: str) -> bool:
        text = message.lower()

        action_patterns = [
            r"\bremind me\b",
            r"\breminder\b",
            r"\bschedule\b",
            r"\bcalendar\b",
            r"\bmeeting\b",
            r"\bappointment\b",
            r"\be-?mail\b",
            r"\bmail\b",
            r"\bsend an email\b",
            r"\bsend email\b",
            r"\bdraft an email\b",
            r"\bwrite an email\b",
            r"\bcreate a task\b",
            r"\badd a task\b",
            r"\bto[- ]do\b",
            r"\btask\b",
            r"\bnote down\b",
            r"\bsave a note\b",
            r"\bmake a note\b",
            r"\bresearch\b",
            r"\block\b",
            r"\bbook\b",
            r"\bdictate my day\b",
            r"\badd to my calendar\b",
            r"\bput .* on my calendar\b",
        ]

        return any(
            re.search(pattern, text)
            for pattern in action_patterns
        )

    # --------------------------------------------------
    # COPY OPTIONAL FIELDS
    # --------------------------------------------------

    def _copy_optional_fields(
        self,
        source: Dict[str, Any],
        destination: Dict[str, Any],
    ) -> None:

        for field in self._ACTION_FIELDS:
            value = source.get(field)

            if value is not None and value != "":
                destination[field] = value

    # --------------------------------------------------
    # LOCAL ACTION PARSING
    # --------------------------------------------------

    def _parse_local_actions(
        self,
        user_message: str
    ) -> List[Dict[str, Any]]:

        if not self._looks_actionable(user_message):
            return []

        try:
            parsed = parse_dictation_to_items(user_message)

        except Exception:
            logger.exception("Local task parser failed.")
            return []

        actions = []

        for task in parsed.get("tasks", []):

            category = str(
                task.get("category", "general")
            ).lower()

            action_type = self._CATEGORY_TO_ACTION_TYPE.get(
                category,
                "task"
            )

            action = {
                "action_type": action_type,
                "title": task.get("title", "Untitled task"),
                "detail": task.get("detail", ""),
                "category": category,
            }

            self._copy_optional_fields(task, action)

            actions.append(action)

        for note in parsed.get("notes", []):

            action = {
                "action_type": "note",
                "title": note.get("title", "Untitled note"),
                "detail": note.get(
                    "detail",
                    note.get("content", "")
                ),
                "category": "note",
            }

            self._copy_optional_fields(note, action)

            actions.append(action)

        return actions

    # --------------------------------------------------
    # OFFLINE RESPONSE
    # --------------------------------------------------

    def _offline_response(
        self,
        user_message: str
    ) -> Dict[str, Any]:

        if (
            self._is_greeting(user_message)
            or self._is_capability_question(user_message)
        ):
            return {
                "message": self._conversation_response(user_message),
                "model": "offline-aura-engine",
                "is_mock": True,
                "structured_actions": [],
            }

        actions = self._parse_local_actions(user_message)

        if actions:

            count = len(actions)

            titles = ", ".join(
                f"'{action['title']}'"
                for action in actions[:3]
            )

            if count > 3:
                titles += f" and {count - 3} more"

            message = (
                f"I've identified {count} item"
                f"{'s' if count != 1 else ''}: {titles}. "
                "They are staged for review."
            )

        else:
            message = self._conversation_response(user_message)

        return {
            "message": message,
            "model": "offline-aura-engine",
            "is_mock": True,
            "structured_actions": actions,
        }

    # --------------------------------------------------
    # MAIN RESPONSE FUNCTION
    # --------------------------------------------------

    async def generate_response(
        self,
        user_message: str,
        history: List[Dict[str, str]],
        custom_system_prompt: Optional[str] = None,
    ) -> Dict[str, Any]:

        user_message = user_message.strip()

        if not user_message:
            return {
                "message": "I didn't catch that. Could you say it again?",
                "model": self.model,
                "is_mock": False,
                "structured_actions": [],
            }

        if (
            self._is_greeting(user_message)
            or self._is_capability_question(user_message)
        ):
            return {
                "message": self._conversation_response(user_message),
                "model": "aura-conversation",
                "is_mock": False,
                "structured_actions": [],
            }

        if not self.is_configured:
            logger.warning("Gemini API key is not configured.")
            return self._offline_response(user_message)

        return await self._call_gemini_api(
            user_message,
            history,
            custom_system_prompt,
        )

    # --------------------------------------------------
    # GEMINI PAYLOAD
    # --------------------------------------------------

    def _build_payload(
        self,
        user_message: str,
        history: List[Dict[str, str]],
        custom_system_prompt: Optional[str],
    ) -> Dict[str, Any]:

        contents = []

        for turn in history[-10:]:

            content = str(
                turn.get("content", "")
            ).strip()

            if not content:
                continue

            role = (
                "user"
                if turn.get("role") == "user"
                else "model"
            )

            contents.append({
                "role": role,
                "parts": [{"text": content}],
            })

        contents.append({
            "role": "user",
            "parts": [{"text": user_message}],
        })

        return {
            "contents": contents,
            "systemInstruction": {
                "parts": [{
                    "text": custom_system_prompt or SYSTEM_VOICE_PROMPT
                }]
            },
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 1000,
                "topP": 0.95,
            },
        }

    # --------------------------------------------------
    # EXTRACT STRUCTURED ACTIONS
    # --------------------------------------------------

    def _extract_actions(
        self,
        response_text: str
    ) -> Tuple[str, List[Dict[str, Any]]]:

        pattern = r"```actions\s*(.*?)\s*```"

        match = re.search(
            pattern,
            response_text,
            re.DOTALL | re.IGNORECASE
        )

        if not match:
            return response_text.strip(), []

        json_text = match.group(1).strip()

        try:
            actions = json.loads(json_text)

            if not isinstance(actions, list):
                return response_text.strip(), []

            valid_action_types = {
                "task",
                "reminder",
                "calendar",
                "email",
                "note",
                "research",
            }

            valid_categories = {
                "task",
                "reminder",
                "calendar",
                "email",
                "note",
                "research",
                "general",
            }

            valid_actions = []

            for action in actions:

                if not isinstance(action, dict):
                    continue

                action_type = str(
                    action.get("action_type", "task")
                ).lower()

                if action_type not in valid_action_types:
                    action_type = "task"

                category = str(
                    action.get("category", "general")
                ).lower()

                if category not in valid_categories:
                    category = "general"

                valid_action = {
                    "action_type": action_type,
                    "title": str(
                        action.get("title", "Untitled task")
                    ),
                    "detail": str(
                        action.get("detail", "")
                    ),
                    "category": category,
                }

                self._copy_optional_fields(
                    action,
                    valid_action
                )

                valid_actions.append(valid_action)

            clean_text = (
                response_text[:match.start()]
                + response_text[match.end():]
            )

            return clean_text.strip(), valid_actions

        except (json.JSONDecodeError, TypeError):
            logger.warning(
                "Gemini returned an invalid actions JSON block."
            )

            return response_text.strip(), []

    # --------------------------------------------------
    # MERGE LOCAL AND GEMINI ACTIONS
    # --------------------------------------------------

    def _merge_actions(
        self,
        gemini_actions: List[Dict[str, Any]],
        local_actions: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:

        if not local_actions:
            return gemini_actions

        # Local parsing is more reliable for these fields.
        # Replace Gemini's email/reminder actions with locally
        # parsed versions to preserve recipient, subject,
        # content, due_time and due_date.
        authoritative_types = {
            "email",
            "reminder",
        }

        local_authoritative = [
            action for action in local_actions
            if action.get("action_type") in authoritative_types
        ]

        if not local_authoritative:
            return gemini_actions or local_actions

        result = [
            action for action in gemini_actions
            if action.get("action_type") not in authoritative_types
        ]

        result.extend(local_authoritative)

        return result

    # --------------------------------------------------
    # GEMINI API CALL
    # --------------------------------------------------

    async def _call_gemini_api(
        self,
        user_message: str,
        history: List[Dict[str, str]],
        custom_system_prompt: Optional[str] = None,
    ) -> Dict[str, Any]:

        payload = self._build_payload(
            user_message,
            history,
            custom_system_prompt,
        )

        try:

            async with httpx.AsyncClient(timeout=40.0) as client:

                response = None

                for attempt in range(self.max_retries):

                    response = await client.post(
                        self.endpoint,
                        params={"key": self.api_key},
                        json=payload,
                        headers={
                            "Content-Type": "application/json"
                        },
                    )

                    if response.status_code == 200:
                        break

                    if response.status_code in (429, 503):

                        if attempt < self.max_retries - 1:

                            wait_seconds = 2 ** attempt

                            logger.warning(
                                "Gemini temporarily unavailable "
                                "(HTTP %s). Retry %s/%s in %s seconds.",
                                response.status_code,
                                attempt + 1,
                                self.max_retries - 1,
                                wait_seconds,
                            )

                            await asyncio.sleep(wait_seconds)
                            continue

                    break

            if response is None:
                return self._offline_response(user_message)

            if response.status_code != 200:

                logger.error(
                    "Gemini API returned HTTP %s: %s",
                    response.status_code,
                    response.text[:1500],
                )

                if response.status_code == 404:

                    fallback = self._offline_response(user_message)

                    fallback["message"] = (
                        "My configured Gemini model is unavailable. "
                        + fallback["message"]
                    )

                    return fallback

                if response.status_code in (429, 503):

                    fallback = self._offline_response(user_message)

                    fallback["message"] = (
                        "Gemini is temporarily busy. "
                        + fallback["message"]
                    )

                    return fallback

                return self._offline_response(user_message)

            data = response.json()

            candidates = data.get("candidates", [])

            if not candidates:
                logger.warning(
                    "Gemini returned no response candidates."
                )

                return self._offline_response(user_message)

            parts = (
                candidates[0]
                .get("content", {})
                .get("parts", [])
            )

            raw_text = "".join(
                part.get("text", "")
                for part in parts
                if isinstance(part, dict)
            ).strip()

            if not raw_text:
                return self._offline_response(user_message)

            clean_message, gemini_actions = self._extract_actions(
                raw_text
            )

            local_actions = self._parse_local_actions(
                user_message
            )

            actions = self._merge_actions(
                gemini_actions,
                local_actions
            )

            return {
                "message": clean_message or "I'm here. How can I help?",
                "model": self.model,
                "is_mock": False,
                "structured_actions": actions,
            }

        except httpx.TimeoutException:

            logger.error("Gemini API request timed out.")

            return self._offline_response(user_message)

        except httpx.RequestError as exc:

            logger.error(
                "Gemini network request failed: %s",
                type(exc).__name__,
            )

            return self._offline_response(user_message)

        except Exception:

            logger.exception(
                "Unexpected error in Gemini service."
            )

            return self._offline_response(user_message)


gemini_service = GeminiService()
