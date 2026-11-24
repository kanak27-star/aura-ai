# Aura — Personal Executive Voice Assistant

[![Frontend](https://img.shields.io/badge/Frontend-React%2019%20%7C%20TypeScript%20%7C%20Vite%20%7C%20TailwindCSS-blue.svg)](https://react.dev/)
[![Backend](https://img.shields.io/badge/Backend-FastAPI%20%7C%20Python%203.11%2B%20%7C%20SQLite-green.svg)](https://fastapi.tiangolo.com/)
[![Intelligence Engine](https://img.shields.io/badge/Intelligence-Google%20Gemini%202.5%20Flash-orange.svg)](https://aistudio.google.com/)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

> **"Say your day. It's handled."**  
> Aura is a personal executive voice assistant designed to simplify everyday productivity through natural voice interactions. It transforms unstructured instructions into organized tasks, calendar events, emails, research items, reminders, and notes—all within a unified workspace.

**Live Application:** [https://aura-frontend-tddt.onrender.com/](https://aura-frontend-tddt.onrender.com/)

**Source Code:** [GitHub Repository](https://github.com/kanak27-star/aura-ai)

---

## 🌟 Key Features

### 1. Natural Voice Interaction & Interactive Visualizer

- **Dynamic Voice Orb:** A custom multi-ring SVG and CSS visualizer that responds to four interaction states:
  - `idle`: Indigo breathing pulse.
  - `listening`: Expanding reactive acoustic waves in cyan and emerald.
  - `thinking`: Orbiting particles and glowing rings in amber and violet.
  - `speaking`: Fluid harmonic waveform in electric violet and blue.
- **Speech-to-Text & Text-to-Speech:** Browser Web Speech API integration using `SpeechRecognition` and `SpeechSynthesis`, with adjustable speech rate and pitch, accessible text input, and simulator support.
- **Push-to-Talk & Keyboard Shortcut:** Activate voice input through the microphone, interactive orb, or `Spacebar` keyboard shortcut.

### 2. Natural-Language Task & Note Segmentation

Aura accepts spoken or written instructions in a single, unstructured stream and intelligently separates them into actionable items.

**Example instruction:**

> "Email Sarah the quarterly launch notes, schedule a design review at 3pm tomorrow, research Web Audio API techniques, and remember to buy coffee beans."

The backend processing system uses rule-based parsing and Gemini integration to organize the instruction into:

- ✉️ **Email:** Email Sarah the quarterly launch notes.
- 📅 **Calendar:** Schedule a design review at 3pm tomorrow.
- 🔍 **Research:** Research Web Audio API techniques.
- ⏰ **Reminder:** Remember to buy coffee beans.
- 📝 **Notes:** Save information in the searchable knowledge repository.

### 3. Executive Dashboard & Productivity Management

- **Dashboard:** Daily greeting, pending and completed task counters, saved notes, and quick voice-launch functionality.
- **Task Management:** Organize tasks by category (Email, Calendar, Reminder, Research, General) and status (Pending, Done), with options to mark tasks complete or delete them.
- **Notes Repository:** Maintain a searchable, tagged knowledge base with clipboard copy and note-to-task conversion.
- **Personalized Settings:** Customize the assistant's name, avatar, personality, speech rate, pitch, and available model parameters.

### 4. Reliability, Security & Error Handling

- **Server-Side API Key Protection:** Gemini API credentials remain on the backend and are never exposed in frontend code.
- **Offline Mock Mode:** When `GEMINI_API_KEY` is unavailable, Aura automatically switches to rule-based task extraction, allowing core workflows to be demonstrated without external API credentials.
- **Resilient Interface:** Loading states, error notifications, and retry mechanisms handle network failures, timeouts, and API rate limits (HTTP 429).
- **Input Validation:** Pydantic schemas validate incoming requests and help maintain consistent API payloads.

---

## 🏗️ Architecture & Project Structure

```text
aura-ai/
├── .env.example              # Root environment template
├── .gitignore                # Git ignore configuration
├── package.json              # Root workspace scripts
├── README.md                 # Project documentation
│
├── backend/                  # FastAPI + SQLite Backend
│   ├── .env.example          # Backend environment template
│   ├── database.py           # SQLite connection & SessionLocal
│   ├── main.py               # FastAPI entrypoint, CORS, lifespans
│   ├── models.py             # SQLAlchemy models (Tasks, Notes, Messages)
│   ├── requirements.txt      # Python dependencies
│   ├── schemas.py            # Pydantic v2 validation models
│   ├── routers/
│   │   ├── conversations.py  # Conversation history & Gemini interaction
│   │   ├── health.py         # Health check endpoint
│   │   ├── notes.py          # Notes CRUD operations
│   │   ├── tasks.py          # Tasks CRUD operations
│   │   └── voice.py          # Voice dictation segmentation
│   ├── services/
│   │   ├── gemini_service.py # Gemini integration & mock fallback
│   │   └── task_parser.py    # Natural-language task segmentation
│   └── tests/
│       └── test_api.py       # Automated pytest suite
│
└── frontend/                 # React 19 + TypeScript + Tailwind CSS
    ├── index.html            # HTML5 application entrypoint
    ├── package.json          # Frontend dependencies
    ├── vite.config.ts        # Vite configuration
    ├── tailwind.config.js    # Theme and animation configuration
    └── src/
        ├── App.tsx           # Main application coordinator
        ├── main.tsx          # React 19 root
        ├── index.css         # Global styles and visual effects
        ├── types/            # Shared TypeScript interfaces
        ├── services/
        │   ├── api.ts        # API client with retry handling
        │   └── speech.ts     # Browser speech recognition & synthesis
        └── components/
            ├── AudioWaveform.tsx  # Dynamic audio visualizer
            ├── ConversationView.tsx # Conversation interface
            ├── DashboardView.tsx   # Dashboard and quick actions
            ├── DictateModal.tsx    # Voice instruction segmentation
            ├── Header.tsx          # Application header
            ├── MicControl.tsx      # Voice input and keyboard shortcut
            ├── NotesPanel.tsx      # Searchable notes repository
            ├── Sidebar.tsx         # Navigation sidebar
            ├── SettingsView.tsx    # Personalization settings
            ├── TaskPanel.tsx       # Categorized task management
            └── VoiceOrb.tsx       # Interactive voice visualizer
```

---

## 🚀 Quick Start Guide

### Prerequisites

- **Node.js:** v18+ (tested on v22.13.1)
- **Python:** v3.10+
- **Git**

### 1. Clone the Repository

```bash
git clone https://github.com/kanak27-star/aura-ai.git
cd aura-ai
```

### 2. Set Up the Backend

```bash
cd backend

# Install Python dependencies
python -m pip install -r requirements.txt

# Configure environment variables
# Copy .env.example to .env
cp .env.example .env

# Add your GEMINI_API_KEY to the .env file.
# Leave it blank to use Offline Mock Mode.

# Run automated tests
python -m pytest tests -v

# Start the FastAPI server
python -m uvicorn main:app --reload --port 8000
```

Backend API: `http://localhost:8000`  
Interactive API documentation: `http://localhost:8000/docs`  
Health check: `http://localhost:8000/api/health`

### 3. Set Up the Frontend

Open a new terminal:

```bash
cd frontend

# Install dependencies
npm install

# Build for production
npm run build

# Start the development server
npm run dev
```

Open the application at:

`http://localhost:5173`

---

## 🧪 Testing

The backend includes an automated test suite using `pytest`.

Run the tests from the project root:

```bash
python -m pytest backend/tests -v
```

The test suite covers:

- System and SQLite database connectivity (`GET /api/health`).
- Conversation generation and structured action extraction (`POST /api/conversations/chat`).
- Input validation, including empty and whitespace-only prompts.
- Conversation history retrieval and deletion.
- Task CRUD operations: create, retrieve, update status, and delete.
- Notes CRUD operations, including search functionality.
- Complex voice dictation parsing into multiple actionable items.

---

## 🔑 Environment Variables

| Variable | Default | Description |
| :--- | :--- | :--- |
| `HOST` | `127.0.0.1` | Backend host |
| `PORT` | `8000` | Backend port |
| `DATABASE_URL` | `sqlite:///./voice_assistant.db` | SQLite database connection URI |
| `GEMINI_API_KEY` | `None` | Google AI Studio API key; optional when using Offline Mock Mode |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Gemini model identifier |
| `VITE_API_URL` | `http://localhost:8000` | Backend API URL for the frontend |

---

## 🛡️ Security & Best Practices

- **Credential Protection:** External service credentials are maintained on the backend rather than exposed in frontend bundles.
- **Request Validation:** Pydantic models validate request payloads, input lengths, and required fields.
- **Error Handling:** Network failures and API quota limitations are handled through retry logic and user-facing error messages.
- **Environment Configuration:** Sensitive configuration values are managed through environment variables and excluded from version control.

---

## 🚀 Deployment & DevOps

- **Docker:** Containerized the application for consistent deployment environments.
- **Kubernetes:** Used Kubernetes configuration files for container orchestration and deployment.
- **CI/CD:** GitHub Actions for workflow automation.

---

## 🔮 Future Enhancements

- Integration with Google Calendar and Gmail for connected productivity workflows.
- Advanced multi-step task planning and execution.
- Persistent contextual memory and personalized recommendations.
- Native Android application with platform-level voice interaction.
- Cross-device synchronization and improved accessibility.
- Productivity analytics and workflow insights.

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).

---

**Built with React, TypeScript, Python, FastAPI, SQLite, and Google Gemini.**
