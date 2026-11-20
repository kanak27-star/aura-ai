
import re
from datetime import datetime, timedelta
from typing import List, Dict, Optional


# --------------------------------------------------
# PRIORITY
# --------------------------------------------------

def get_priority(text: str) -> str:
    text_lower = text.lower()

    if any(word in text_lower for word in [
        "urgent", "asap", "high priority", "important"
    ]):
        return "high"

    if any(word in text_lower for word in [
        "low priority", "not urgent"
    ]):
        return "low"

    return "medium"


# --------------------------------------------------
# CATEGORY
# --------------------------------------------------

def get_category(text: str) -> str:
    text_lower = text.lower()

    if re.search(r"\b(?:e-?mail|mail)\b", text_lower):
        return "email"

    if re.search(
        r"\b(meeting|appointment|schedule|calendar|book)\b",
        text_lower
    ):
        return "calendar"

    if re.search(
        r"\b(remind me|reminder|don't forget)\b",
        text_lower
    ):
        return "reminder"

    if re.search(
        r"\b(research|find out|look up|investigate)\b",
        text_lower
    ):
        return "research"

    if re.search(
        r"\b(note down|make a note|write down|remember that)\b",
        text_lower
    ):
        return "note"

    return "task"


# --------------------------------------------------
# TIME EXTRACTION
# --------------------------------------------------

def extract_time(text: str) -> Optional[str]:
    patterns = [
        r"\b\d{1,2}:\d{2}\s*(?:am|pm)\b",
        r"\b\d{1,2}\s*(?:am|pm)\b",
        r"\b(?:[01]?\d|2[0-3]):[0-5]\d\b"
    ]

    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)

        if match:
            return re.sub(r"\s+", "", match.group(0)).upper()

    return None


# --------------------------------------------------
# DATE EXTRACTION
# --------------------------------------------------

def extract_date(text: str) -> Optional[str]:
    text_lower = text.lower()
    today = datetime.now().date()

    if re.search(r"\bday after tomorrow\b", text_lower):
        return (today + timedelta(days=2)).isoformat()

    if re.search(r"\btomorrow\b", text_lower):
        return (today + timedelta(days=1)).isoformat()

    if re.search(r"\btoday\b", text_lower):
        return today.isoformat()

    weekdays = {
        "monday": 0,
        "tuesday": 1,
        "wednesday": 2,
        "thursday": 3,
        "friday": 4,
        "saturday": 5,
        "sunday": 6
    }

    for day, weekday in weekdays.items():
        if re.search(rf"\b{day}\b", text_lower):
            days_ahead = (weekday - today.weekday()) % 7

            if days_ahead == 0:
                days_ahead = 7

            return (
                today + timedelta(days=days_ahead)
            ).isoformat()

    numeric_date = re.search(
        r"\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b",
        text
    )

    if numeric_date:
        day = int(numeric_date.group(1))
        month = int(numeric_date.group(2))
        year = numeric_date.group(3)

        if year:
            year = int(year)

            if year < 100:
                year += 2000
        else:
            year = today.year

        try:
            return datetime(
                year, month, day
            ).date().isoformat()
        except ValueError:
            return None

    return None


# --------------------------------------------------
# EMAIL RECIPIENT EXTRACTION
# --------------------------------------------------

def extract_recipient(text: str) -> Optional[str]:
    patterns = [
        r"\b(?:send|write|draft)\s+(?:an?\s+)?e-?mail\s+to\s+([A-Za-z][A-Za-z0-9._-]*)\b",

        r"\b(?:send\s+)?(?:an?\s+)?e-?mail\s+to\s+([A-Za-z][A-Za-z0-9._-]*)\b",

        r"\b(?:e-?mail|mail)\s+(?:to\s+)?([A-Za-z][A-Za-z0-9._-]*)\b",

        r"\bsend\s+([A-Za-z][A-Za-z0-9._-]*)\s+an?\s+e-?mail\b"
    ]

    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)

        if match:
            recipient = match.group(1)

            if recipient.lower() not in {
                "an", "a", "the", "to",
                "about", "regarding", "subject",
                "message", "body"
            }:
                return recipient

    return None


# --------------------------------------------------
# EMAIL SUBJECT EXTRACTION
# --------------------------------------------------

def extract_email_subject(text: str) -> Optional[str]:
    patterns = [
        r"\bsubject\s*:\s*(.+?)(?=\s*,?\s*(?:message|body)\s*:|$)",

        r"\bsubject\s+(?!is\b)(.+?)(?=\s*,?\s*(?:message|body)\s*:|$)",

        r"\babout\s+(.+?)(?=\s*,?\s*(?:message|body)\s*:|$)"
    ]

    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)

        if match:
            subject = match.group(1).strip(" ,.!?")

            if subject:
                return subject

    return None


# --------------------------------------------------
# EMAIL MESSAGE BODY EXTRACTION
# --------------------------------------------------

def extract_email_body(text: str) -> Optional[str]:
    patterns = [
        r"\bmessage\s*:\s*(.+)$",
        r"\bbody\s*:\s*(.+)$",
        r"\bsaying\s+(.+)$"
    ]

    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)

        if match:
            body = match.group(1).strip(" ,.!?")

            if body:
                return body

    return None


# --------------------------------------------------
# EMAIL DETAIL EXTRACTION
# --------------------------------------------------

def extract_email_detail(text: str, recipient: str) -> str:
    detail = re.sub(
        r"^\s*(?:(?:please\s+)?(?:send|write|draft)\s+)?"
        r"(?:an?\s+)?(?:e-?mail|mail)\s+(?:to\s+)?",
        "",
        text,
        flags=re.IGNORECASE
    )

    detail = re.sub(
        rf"^\s*{re.escape(recipient)}\b",
        "",
        detail,
        flags=re.IGNORECASE
    )

    # Remove subject information.
    detail = re.sub(
        r"\bsubject\s*:?\s*.+?(?=\s*,?\s*(?:message|body)\s*:|$)",
        "",
        detail,
        flags=re.IGNORECASE
    )

    # Remove message body information.
    detail = re.sub(
        r"\b(?:message|body)\s*:\s*.+$",
        "",
        detail,
        flags=re.IGNORECASE
    )

    detail = re.sub(
        r"\bsaying\s+.+$",
        "",
        detail,
        flags=re.IGNORECASE
    )

    # If "about ..." was extracted as the subject,
    # it should not be duplicated in the details.
    subject = extract_email_subject(text)

    if subject:
        detail = re.sub(
            r"\babout\s+.+$",
            "",
            detail,
            flags=re.IGNORECASE
        )

    return re.sub(r"\s+", " ", detail).strip(" ,.!?")


# --------------------------------------------------
# TITLE CLEANING
# --------------------------------------------------

def clean_title(text: str) -> str:
    title = text.strip()

    title = re.sub(
        r"^\s*(?:hey|hi|hello)\s+(?:aura|ora|laura)\s*[:,]?\s*",
        "",
        title,
        flags=re.IGNORECASE
    )

    title = re.sub(
        r"^\s*(?:dictate me|dictate my day|here is my day|my tasks are)\s*[:,\-]?\s*",
        "",
        title,
        flags=re.IGNORECASE
    )

    title = re.sub(
        r"^\s*(?:please\s+)?(?:remind me to|remind me|reminder to|create a reminder to|add a reminder to)\s*",
        "",
        title,
        flags=re.IGNORECASE
    )

    title = re.sub(
        r"^\s*(?:schedule|book|create|add)\s+(?:a\s+)?(?:meeting|appointment|event)?\s*",
        "",
        title,
        flags=re.IGNORECASE
    )

    title = re.sub(
        r"\b(?:at|by)\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)\b",
        "",
        title,
        flags=re.IGNORECASE
    )

    title = re.sub(
        r"\b(?:today|tomorrow|day after tomorrow)\b",
        "",
        title,
        flags=re.IGNORECASE
    )

    title = re.sub(
        r"\b(?:on|by)\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b",
        "",
        title,
        flags=re.IGNORECASE
    )

    title = re.sub(r"\s+", " ", title)
    title = title.strip(" ,.!?-")

    return title.capitalize() if title else "Untitled"


# --------------------------------------------------
# CLEAN REMINDER / TASK DETAILS
# --------------------------------------------------

def clean_detail(text: str) -> str:
    detail = text.strip()

    detail = re.sub(
        r"^\s*(?:please\s+)?(?:remind me to|remind me|reminder to|create a reminder to|add a reminder to)\s*",
        "",
        detail,
        flags=re.IGNORECASE
    )

    detail = re.sub(
        r"\b(?:at|by)\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)\b",
        "",
        detail,
        flags=re.IGNORECASE
    )

    detail = re.sub(
        r"\b(?:today|tomorrow|day after tomorrow)\b",
        "",
        detail,
        flags=re.IGNORECASE
    )

    detail = re.sub(
        r"\b(?:on|by)\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b",
        "",
        detail,
        flags=re.IGNORECASE
    )

    detail = re.sub(
        r"\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b",
        "",
        detail
    )

    detail = re.sub(r"\s+", " ", detail)

    return detail.strip(" ,.!?-")


# --------------------------------------------------
# REMOVE DICTATION PREFIXES
# --------------------------------------------------

def remove_dictation_prefix(text: str) -> str:
    text = text.strip()

    prefix_pattern = (
        r"^\s*(?:(?:dictate\s+me|dictate\s+my\s+day|"
        r"here\s+is\s+my\s+day|my\s+tasks\s+are)"
        r"\s*[:,\-]?\s*)+"
    )

    previous = None

    while previous != text:
        previous = text

        text = re.sub(
            prefix_pattern,
            "",
            text,
            flags=re.IGNORECASE
        ).strip()

    text = re.sub(
        r"^(?:hey|hi|hello)\s+(?:aura|ora|laura)\s*[:,]?\s*",
        "",
        text,
        flags=re.IGNORECASE
    )

    return text.strip()


# --------------------------------------------------
# SPLIT MULTIPLE INSTRUCTIONS
# --------------------------------------------------

def split_instructions(text: str) -> List[str]:
    text = remove_dictation_prefix(text)

    if not text:
        return []

    command_pattern = (
        r"(?:remind\s+me|reminder|e-?mail|mail|send|"
        r"schedule|book|create|add|note\s+down|research)"
    )

    separators = re.split(
        rf"(?:[.!?]\s+|,\s+|\band then\b|\bthen\b)"
        rf"(?={command_pattern}\b)",
        text,
        flags=re.IGNORECASE
    )

    instructions = []

    for part in separators:
        part = part.strip(" ,.!?")

        if not part:
            continue

        and_parts = re.split(
            rf"\band\b(?=\s*{command_pattern}\b)",
            part,
            flags=re.IGNORECASE
        )

        for item in and_parts:
            item = item.strip(" ,.!?")

            if item:
                instructions.append(item)

    return instructions


# --------------------------------------------------
# PARSE ONE INSTRUCTION
# --------------------------------------------------

def categorize_sentence(sentence: str) -> Dict:
    category = get_category(sentence)
    priority = get_priority(sentence)

    due_time = extract_time(sentence)
    due_date = extract_date(sentence)
    recipient = extract_recipient(sentence)

    subject = None
    body = None

    if category == "email" and recipient:
        title = f"Email {recipient}"

        subject = extract_email_subject(sentence)
        body = extract_email_body(sentence)

        detail = extract_email_detail(sentence, recipient)

    else:
        title = clean_title(sentence)
        detail = clean_detail(sentence)

    item = {
        "title": title,
        "detail": detail,
        "category": category,
        "priority": priority,
        "status": "pending"
    }

    if subject:
        item["subject"] = subject

    if body:
        item["content"] = body

    if due_time:
        item["due_time"] = due_time

    if due_date:
        item["due_date"] = due_date

    if recipient:
        item["recipient"] = recipient

    return item


# --------------------------------------------------
# MAIN PARSER
# --------------------------------------------------

def parse_dictation_to_items(text: str) -> Dict[str, List[Dict]]:
    instructions = split_instructions(text)

    tasks = []
    notes = []

    for instruction in instructions:
        item = categorize_sentence(instruction)

        if item["category"] == "note":
            notes.append(item)
        else:
            tasks.append(item)

    return {
        "tasks": tasks,
        "notes": notes
    }
