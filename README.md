# Aura AI — Personal Executive Voice Assistant

[![Frontend](https://img.shields.io/badge/Frontend-React%2019%20%7C%20TypeScript%20%7C%20Vite%20%7C%20TailwindCSS-blue.svg)](https://react.dev/)
[![Backend](https://img.shields.io/badge/Backend-FastAPI%20%7C%20Python%203.11%2B%20%7C%20SQLite-green.svg)](https://fastapi.tiangolo.com/)
[![AI Engine](https://img.shields.io/badge/AI-Google%20Gemini%202.5%20Flash-orange.svg)](https://aistudio.google.com/)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

> **"Say your day. It's handled."**  
> An original, portfolio-ready personal AI voice assistant inspired by the concept of [Fraise AI](https://fraise.vercel.app/). Aura AI allows you to speak your entire day in one breath, intelligently splitting complex streams of thought into categorized tasks, calendar events, emails, research topics, and notes.

---

## 🌟 Key Features

### 1. Natural AI Voice Dialogue & Interactive Visualizer
- **Harmonic Voice Orb**: Mesmerizing, multi-ring SVG & CSS harmonic orb responding in real time to 4 distinct states:
  - `idle`: Indigo breathing pulse.
  - `listening`: Expanding reactive acoustic waves (Cyan & Emerald).
  - `thinking`: Orbiting particles and glowing rings (Amber & Violet).
  - `speaking`: Harmonic fluid waveform (Electric Violet & Blue).
- **Speech-to-Text & Text-to-Speech**: Full browser Web Speech API integration (`SpeechRecognition` & `SpeechSynthesis`) with speech rate and pitch control, plus accessible text fallback and simulator.
- **Push-to-Talk / Hotkey**: Tap the mic, click the orb, or simply press <kbd>Spacebar</kbd> anywhere to start dictating.

### 2. "Say Your Day" Task & Note Segmentation
- Speak or paste an unstructured stream of consciousness:
  > *"Email Sarah the quarterly launch notes, schedule a design review at 3pm tomorrow, research Web Audio API techniques, and remember to buy coffee beans."*
- Aura’s backend heuristic and Gemini core segment the dictation into structured actionable cards:
  - ✉️ **Email**: *"Email Sarah the quarterly launch notes"*
  - 📅 **Calendar**: *"Schedule a design review at 3pm tomorrow"*
  - 🔍 **Research**: *"Research Web Audio API techniques"*
  - ⏰ **Reminder**: *"Remember to buy coffee beans"*
  - 📝 **Notes**: Stored directly into the searchable knowledge base.

### 3. Executive Dashboard & Task Management
- **Dashboard**: Daily greeting, pending task counters, completed counters, saved memos, and rapid voice launcher.
- **Task Board**: Filter by category (Email, Calendar, Reminder, Research, General) or status (Pending, Done), with one-click completion and deletions.
- **Notes Repository**: Tagged knowledge base with search, clipboard copy, and "Convert Note to Task" pipeline.
- **Personalized Settings**: Customize assistant name, avatar glyph, personality vibe, speech rates, and model parameters.

### 4. Enterprise-Grade Reliability & Security
- **Server-Side API Key Protection**: Gemini API keys are never exposed to the client.
- **Smart Offline Mock Mode**: If `GEMINI_API_KEY` is not configured, Aura automatically boots in an intelligent offline mode with rule-based task extraction so you can demo the full app anywhere without an internet connection or API credits.
- **Resilient UI States**: Explicit Loading skeletons, Error banners, and immediate **Retry** triggers on network timeouts or rate limits (HTTP 429).

---

## 🏗️ Architecture & Project Structure

```text
FraiseAI/
├── .env.example              # Root environment template
├── .gitignore                # Production gitignore for Node & Python
├── package.json              # Root workspace scripts
├── README.md                 # Complete project documentation
│
├── backend/                  # FastAPI + SQLite Backend
│   ├── .env.example          # Backend environment template
│   ├── database.py           # SQLite connection & SessionLocal
│   ├── main.py               # FastAPI entrypoint, CORS, lifespans
│   ├── models.py             # SQLAlchemy models (Tasks, Notes, Messages)
│   ├── requirements.txt      # Python dependencies
│   ├── schemas.py            # Pydantic v2 validation models
│   ├── routers/
│   │   ├── conversations.py  # Chat history & Gemini interaction
│   │   ├── health.py         # Health check endpoint (/api/health)
│   │   ├── notes.py          # Notes CRUD
│   │   ├── tasks.py          # Tasks CRUD
│   │   └── voice.py          # Voice dictation segmentation
│   ├── services/
│   │   ├── gemini_service.py # Gemini 2.5 Flash API + Mock fallback
│   │   └── task_parser.py    # Natural language task segmentation
│   └── tests/
│       └── test_api.py       # Automated pytest suite (7+ tests)
│
└── frontend/                 # React 19 + TypeScript + Tailwind CSS
    ├── index.html            # Dark-themed HTML5 entrypoint
    ├── package.json          # Frontend dependencies
    ├── vite.config.ts        # Vite configuration with /api backend proxy
    ├── tailwind.config.js    # Dark obsidian palette & glowing animations
    └── src/
        ├── App.tsx           # Master view coordinator & voice engine
        ├── main.tsx          # React 19 root
        ├── index.css         # Glassmorphism, waves, glowing utilities
        ├── types/            # Shared TypeScript interfaces
        ├── services/
        │   ├── api.ts        # Resilient API client with retry logic
        │   └── speech.ts     # Web Speech STT & TTS controller
        └── components/
            ├── AudioWaveform.tsx  # Dynamic frequency bar visualizer
            ├── ConversationView.tsx# AI chat dialogue, error & retry states
            ├── DashboardView.tsx  # Executive metrics & quick actions
            ├── DictateModal.tsx   # "Say Your Day" segmentation modal
            ├── Header.tsx         # Brand header & connection status
            ├── MicControl.tsx     # Voice trigger button with hotkey
            ├── NotesPanel.tsx     # Searchable notes repository
            ├── Sidebar.tsx        # Navigation sidebar with badge counts
            ├── SettingsView.tsx   # Persona & speech customization
            ├── TaskPanel.tsx      # Categorized task board
            └── VoiceOrb.tsx       # Original reactive multi-ring visualizer
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v18+ (tested on v22.13.1)
- **Python**: v3.10+ (tested on v3.14.7)
- **Git**

### 1. Clone & Set Up Backend

```bash
cd backend

# Install Python dependencies
python -m pip install -r requirements.txt

# (Optional) Configure Gemini API Key
# Copy .env.example to .env
cp .env.example .env
# Edit .env and paste your GEMINI_API_KEY (or leave blank to use Offline Mock Mode)

# Run automated tests
python -m pytest tests -v

# Start the FastAPI server
python -m uvicorn main:app --reload --port 8000
```
Backend API will be running at: `http://localhost:8000`  
Interactive Swagger docs: `http://localhost:8000/docs`  
Health check: `http://localhost:8000/api/health`

### 2. Set Up & Run Frontend

```bash
cd frontend

# Install dependencies
npm install

# Build for production (verifies TypeScript types & Vite assets)
npm run build

# Start local development server
npm run dev
```
Open your browser at: `http://localhost:5173`

---

## 🧪 Testing

The backend includes a comprehensive automated test suite with `pytest`:

```bash
# From the project root or backend folder:
python -m pytest backend/tests -v
```

Tests verify:
- System and SQLite database connectivity (`GET /api/health`).
- Conversational chat generation and structured action extraction (`POST /api/conversations/chat`).
- Input validation (rejecting empty or whitespace-only prompts with HTTP 422).
- Session history retrieval and deletion (`GET` / `DELETE /api/conversations`).
- Task CRUD operations (create, query, update status to done, delete).
- Note CRUD operations (create, query with search filter, delete).
- Complex speech dictation parsing into multiple discrete tasks.

---

## 🔑 Environment Variables Reference

| Variable | Default | Description |
| :--- | :--- | :--- |
| `HOST` | `127.0.0.1` | Backend host |
| `PORT` | `8000` | Backend port |
| `DATABASE_URL` | `sqlite:///./voice_assistant.db` | SQLite database URI |
| `GEMINI_API_KEY` | *(None)* | Google AI Studio Gemini API key. If empty, runs in Smart Mock Mode. |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Supported models: `gemini-2.5-flash`, `gemini-1.5-flash`, `gemini-1.5-pro` |
| `VITE_API_URL` | `http://localhost:8000` | Frontend backend API URL |

---

## 🛡️ Security Best Practices
- **No Client-Side Secrets**: Frontend makes requests only to the local `/api` backend proxy. No API keys exist in client bundles.
- **Input Sanitization**: Backend Pydantic models validate input length, whitespace, and payload schemas.
- **Graceful Rate Limiting**: Automatic backoff and friendly error handling when hitting AI provider quotas.

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
