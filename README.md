# StudyMate AI

An AI-powered study assistant that turns your notes into an interactive learning experience. Upload any PDF, DOCX, or TXT file and chat with it, generate summaries, take quizzes, and study with flashcards — all grounded in your own material.

---

## Features

| Feature | Description |
|---|---|
| **AI Chat** | Ask questions about your notes using RAG — answers are always grounded in your documents |
| **Smart Suggestions** | Contextual follow-up chip suggestions update after every AI response |
| **Topic Walkthrough** | AI identifies all topics and subtopics and walks you through them step by step |
| **AI Summary** | Structured summary with key concepts, bullet points, and definitions |
| **Quiz Generator** | Auto-generated MCQ quizzes with instant scoring and history |
| **Flashcards** | Flip-card study mode with 3D animation, "mark as known" tracking, and deck history |
| **Chat History** | All conversations saved and synced per user account |
| **User Accounts** | Full auth system — signup, login, email OTP verification, password reset |
| **Cross-Device Sync** | Documents, chats, quiz history, and flashcard history all tied to your account |
| **Mobile Responsive** | Full mobile support with slide-in sidebar, touch-friendly layout |
| **Feedback** | In-app feedback form that delivers messages directly to the developer's email |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, React 18, Tailwind CSS, Framer Motion |
| Backend | Python 3.10+, FastAPI, Uvicorn |
| Database | SQLite via SQLAlchemy (auth, chat history, quiz/flashcard history) |
| Embeddings | `sentence-transformers` — `all-MiniLM-L6-v2` |
| Vector Store | FAISS (per-document indexes, disk-persisted) |
| LLM | Groq (primary) → Google Gemini → OpenAI (auto-fallback chain) |
| Email | Resend API (OTP, password reset, feedback) |
| File Processing | `pypdf`, `python-docx` |

---

## Project Structure

```
StudyMateAI/
├── backend/
│   ├── main.py                      ← FastAPI app & router registration
│   ├── database.py                  ← SQLAlchemy engine & session
│   ├── models.py                    ← DB models (User, Document, Chat, Quiz, Flashcard)
│   ├── requirements.txt
│   ├── .env.example                 ← Copy to .env and fill in keys
│   │
│   ├── routes/
│   │   ├── auth.py                  ← Signup, login, OTP, password reset
│   │   ├── upload.py                ← POST /api/upload, GET /api/documents
│   │   ├── ask.py                   ← POST /api/ask  (RAG Q&A)
│   │   ├── topics.py                ← POST /api/topics, /api/explain-topic
│   │   ├── summary.py               ← POST /api/summary
│   │   ├── quiz.py                  ← POST /api/quiz
│   │   ├── flashcards.py            ← POST /api/flashcards
│   │   ├── chat_history.py          ← CRUD /api/chat/sessions
│   │   ├── quiz_history.py          ← CRUD /api/quiz-history
│   │   ├── flashcard_history.py     ← CRUD /api/flashcard-history
│   │   └── feedback.py              ← POST /api/feedback
│   │
│   ├── services/
│   │   ├── llm_service.py           ← LLM calls, prompts, Map-Reduce for large docs
│   │   ├── rag_service.py           ← RAG pipeline orchestration
│   │   ├── file_processor.py        ← PDF / DOCX / TXT text extraction
│   │   └── text_splitter.py         ← Overlap-aware text chunking
│   │
│   ├── embeddings/
│   │   └── embedding_service.py     ← sentence-transformers singleton
│   │
│   ├── vector_db/
│   │   └── faiss_store.py           ← Per-document FAISS indexes (disk-persisted)
│   │
│   ├── utils/
│   │   └── helpers.py               ← generate_doc_id, allowed_file, format_file_size
│   │
│   └── data/                        ← Auto-created at runtime (gitignored)
│       ├── indexes/                 ← FAISS index files per document
│       └── chunks/                  ← JSON chunk files per document
│
└── frontend/
    ├── pages/
    │   ├── _app.js                  ← Global styles, toast provider
    │   ├── index.js                 ← Redirects to /login
    │   ├── login.jsx                ← Sign up / sign in / OTP / forgot password
    │   ├── dashboard.jsx            ← Main app shell, section routing
    │   └── reset-password.jsx       ← Password reset flow
    │
    ├── components/
    │   ├── Sidebar.jsx              ← Navigation, documents, recent chats, sign-out
    │   ├── ChatInterface.jsx        ← RAG chat, topic walkthrough, dynamic chips
    │   ├── FileUpload.jsx           ← Drag-and-drop upload with progress
    │   ├── SummaryPanel.jsx         ← Key concepts, bullets, topic expansion
    │   ├── QuizPanel.jsx            ← MCQ quiz with scoring and history tab
    │   ├── FlashcardPanel.jsx       ← 3D flip cards with history tab
    │   ├── FeedbackModal.jsx        ← Feedback form (Suggestion / Bug / Question)
    │   └── GeneratingLoader.jsx     ← Animated step-by-step generation indicator
    │
    └── services/
        └── api.js                   ← All Axios API calls (typed, timeout-aware)
```

---

## Setup

### Prerequisites

- **Python 3.10+**
- **Node.js 18+**
- A free **Groq API key** — [console.groq.com](https://console.groq.com) (recommended, fastest)
- A **Resend API key** — [resend.com](https://resend.com) (for OTP emails, free tier)

---

### 1 — Backend

```bash
cd backend

# Create and activate virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

---

### 2 — Configure environment

```bash
cp .env.example .env
```

Open `backend/.env` and fill in your keys:

```env
# Primary LLM (Groq is free and fast)
LLM_PROVIDER=groq
GROQ_API_KEY=your_groq_key_here
GROQ_MODEL=llama-3.3-70b-versatile

# Email (OTP, password reset, feedback)
RESEND_API_KEY=your_resend_key_here
RESEND_FROM=onboarding@resend.dev
FEEDBACK_TO=your@email.com

# CORS — add your frontend origins
CORS_ORIGINS=http://localhost:3000

# Optional fallback LLMs
GOOGLE_API_KEY=your_gemini_key_here
OPENAI_API_KEY=your_openai_key_here
```

---

### 3 — Start the backend

```bash
# From the backend/ directory with venv active
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

> Use `python -m uvicorn` (not just `uvicorn`) to avoid path issues on Windows.

API docs available at: **http://localhost:8000/docs**

---

### 4 — Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
```

Open `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

```bash
npm run dev
```

Open **http://localhost:3000**

---

## Mobile / Multi-Device Access

To use the app from your phone on the same Wi-Fi network:

1. Find your machine's local IP (run `ipconfig` on Windows → look for IPv4 Address)
2. Update `backend/.env`:
   ```env
   CORS_ORIGINS=http://localhost:3000,http://192.168.x.x:3000
   ```
3. Update `frontend/.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=http://192.168.x.x:8000
   ```
4. Restart both servers
5. Open `http://192.168.x.x:3000` on your phone

All data (documents, chats, history) syncs automatically through the shared backend.

---

## API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Create account |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/verify-otp` | Verify email OTP |
| POST | `/api/auth/resend-otp` | Resend OTP |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password` | Reset with token |

### Documents
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload` | Upload and index a file |
| GET | `/api/documents` | List documents for a user |
| DELETE | `/api/documents/{doc_id}` | Delete a document |

### AI Features
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ask` | RAG question answering |
| POST | `/api/topics` | Extract document topics |
| POST | `/api/explain-topic` | Explain a specific topic |
| POST | `/api/summary` | Generate document summary |
| POST | `/api/quiz` | Generate MCQ quiz |
| POST | `/api/flashcards` | Generate flashcard deck |

### History & Feedback
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST/GET/DELETE | `/api/chat/sessions` | Chat session management |
| POST/GET/DELETE | `/api/quiz-history` | Quiz result history |
| POST/GET/DELETE | `/api/flashcard-history` | Flashcard deck history |
| POST | `/api/feedback` | Submit feedback/bug report |

---

## LLM Provider Fallback

The app automatically tries multiple providers in sequence if one is rate-limited:

```
Answer chain:  Groq 70B → Groq Scout 17B → Gemini Flash → Groq 8B
Simple chain:  Groq 8B  → Groq Scout 17B → Gemini Flash → Groq 70B
```

No configuration needed — it just works. Add keys for the providers you want available.

---

## Troubleshooting

**`sentence-transformers` is slow on first start**  
The model (~90 MB) downloads once. Subsequent starts load from cache in seconds.

**"Document not found" in old chat sessions**  
Happens when the original document was deleted or uploaded from another device. The app automatically falls back to searching across all your available documents.

**Port conflict on Windows**  
Use `python -m uvicorn` instead of `uvicorn` to avoid the Windows launcher path issue.

**CORS error in browser**  
Make sure the frontend origin is listed in `CORS_ORIGINS` in your `.env`.

**Emails not arriving**  
Check your `RESEND_API_KEY` in `.env`. The free Resend tier sends up to 100 emails/day.
