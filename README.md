# StudyMate AI

An AI-powered study assistant that turns your notes into an interactive learning experience. Upload any PDF, DOCX, or TXT file and chat with it, generate summaries, take quizzes, and study with flashcards — all grounded in your own material.

---

## Features

| Feature | Description |
|---|---|
| **AI Chat** | Ask questions about your notes using RAG — answers are always grounded in your documents |
| **Smart Suggestions** | Contextual follow-up chip suggestions update dynamically after every AI response |
| **Topic Walkthrough** | AI identifies all topics and subtopics and walks you through them step by step |
| **AI Summary** | Structured summary with key concepts, bullet points, and definitions |
| **Quiz Generator** | Auto-generated MCQ quizzes with instant scoring and history |
| **Flashcards** | Flip-card study mode with 3D animation, "mark as known" tracking, and deck history |
| **Chat History** | All conversations saved and synced per user account across devices |
| **User Accounts** | Full auth system — signup, login, email OTP verification, password reset |
| **Cross-Device Sync** | Documents, chats, quiz history, and flashcard history all tied to your account |
| **Mobile Responsive** | Full mobile support with slide-in sidebar, touch-friendly layout, always-visible sign-out |
| **Feedback** | In-app feedback form that delivers messages directly to the developer's email via Gmail |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, React 18, Tailwind CSS, Framer Motion |
| Backend | Python 3.10+, FastAPI, Uvicorn |
| Database | PostgreSQL via SQLAlchemy (Supabase in production, SQLite for local dev) |
| Embeddings | Hash-based TF vectorizer — no ML model, no API, no bundle bloat |
| Vector Store | Numpy cosine similarity, embeddings persisted in PostgreSQL |
| LLM | Groq (primary) → Google Gemini → OpenAI (auto-fallback chain) |
| Email | Gmail SMTP via Python `smtplib` (OTP, password reset, feedback) |
| File Processing | `pypdf`, `python-docx` |
| Deployment | Vercel (Next.js frontend + FastAPI Python serverless via `experimentalServices`) |

---

## Project Structure

```
StudyMateAI/
├── vercel.json                      ← Vercel multi-service deployment config
├── .gitignore
│
├── backend/
│   ├── main.py                      ← FastAPI app & router registration
│   ├── database.py                  ← SQLAlchemy engine (SQLite locally, PostgreSQL on Vercel)
│   ├── models.py                    ← DB models (User, Document, DocumentChunk, Chat, Quiz, Flashcard)
│   ├── requirements.txt
│   ├── vercel.json                  ← Python runtime config for Vercel
│   ├── .env.example
│   │
│   ├── api/
│   │   └── index.py                 ← Vercel serverless entry point (from main import app)
│   │
│   ├── routes/
│   │   ├── auth.py                  ← Signup, login, OTP, password reset
│   │   ├── upload.py                ← POST /api/upload, GET /api/documents
│   │   ├── ask.py                   ← POST /api/ask (RAG Q&A with graceful fallback)
│   │   ├── topics.py                ← POST /api/topics, /api/explain-topic
│   │   ├── summary.py               ← POST /api/summary
│   │   ├── quiz.py                  ← POST /api/quiz
│   │   ├── flashcards.py            ← POST /api/flashcards
│   │   ├── chat_history.py          ← CRUD /api/chat/sessions
│   │   ├── quiz_history.py          ← CRUD /api/quiz-history
│   │   ├── flashcard_history.py     ← CRUD /api/flashcard-history
│   │   └── feedback.py              ← POST /api/feedback (Gmail SMTP)
│   │
│   ├── services/
│   │   ├── llm_service.py           ← LLM calls, prompts, Map-Reduce for large docs
│   │   ├── rag_service.py           ← RAG pipeline orchestration
│   │   ├── file_processor.py        ← PDF / DOCX / TXT text extraction
│   │   └── text_splitter.py         ← Overlap-aware text chunking
│   │
│   ├── embeddings/
│   │   └── embedding_service.py     ← Hash-based TF vectorizer (no API, no ML deps)
│   │
│   ├── vector_db/
│   │   └── faiss_store.py           ← Numpy cosine similarity, DB-backed persistence
│   │
│   └── utils/
│       ├── helpers.py               ← generate_doc_id, allowed_file, format_file_size
│       └── email.py                 ← Gmail SMTP sender (used by auth + feedback)
│
└── frontend/
    ├── pages/
    │   ├── _app.js                  ← Global styles, toast provider
    │   ├── index.js                 ← Redirects to /login
    │   ├── login.jsx                ← Sign up / sign in / OTP / forgot password
    │   ├── dashboard.jsx            ← Main app shell, section routing, mobile header
    │   └── reset-password.jsx       ← Password reset flow
    │
    ├── components/
    │   ├── Sidebar.jsx              ← Navigation, recent chats, feedback, sign-out
    │   ├── ChatInterface.jsx        ← RAG chat, topic walkthrough, dynamic chips
    │   ├── FileUpload.jsx           ← Drag-and-drop upload with progress bar
    │   ├── SummaryPanel.jsx         ← Key concepts, bullets, topic expansion
    │   ├── QuizPanel.jsx            ← MCQ quiz with scoring and history tab
    │   ├── FlashcardPanel.jsx       ← 3D flip cards with history tab
    │   ├── FeedbackModal.jsx        ← Feedback form (Suggestion / Bug / Question / Other)
    │   ├── ThreeBackground.jsx      ← Animated 3D background (login page)
    │   └── GeneratingLoader.jsx     ← Animated step-by-step generation indicator
    │
    └── services/
        └── api.js                   ← All Axios API calls, auto-detects prod vs local URL
```

---

## Local Development Setup

### Prerequisites

- **Python 3.10+**
- **Node.js 18+**
- A free **Groq API key** — [console.groq.com](https://console.groq.com)
- A **Gmail App Password** — for sending OTP and feedback emails

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

### 2 — Configure environment

```bash
cp .env.example .env
```

Open `backend/.env`:

```env
# Primary LLM
LLM_PROVIDER=groq
GROQ_API_KEY=your_groq_key_here
GROQ_MODEL=llama-3.3-70b-versatile

# Email — Gmail App Password (go.to myaccount.google.com/apppasswords)
GMAIL_USER=your@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx

# Feedback destination
FEEDBACK_TO=your@gmail.com

# CORS
CORS_ORIGINS=http://localhost:3000

# Optional fallback LLMs
GOOGLE_API_KEY=your_gemini_key_here
OPENAI_API_KEY=your_openai_key_here

# Production only (Supabase PostgreSQL connection string)
# DATABASE_URL=postgresql://postgres:password@db.xxxx.supabase.co:5432/postgres
```

> **Local dev**: Leave `DATABASE_URL` unset. SQLite (`studymate_auth.db`) is used automatically.

### 3 — Start the backend

```bash
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

> Use `python -m uvicorn` (not just `uvicorn`) to avoid path issues on Windows.

API docs: **http://localhost:8000/docs**

### 4 — Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

```bash
npm run dev
```

Open **http://localhost:3000**

---

## Deploying to Vercel

### 1 — Database (Supabase)

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **Settings → Database → Connection string → URI**
3. Copy the PostgreSQL connection string

### 2 — Vercel Environment Variables

In your Vercel project → **Settings → Environment Variables**, add:

| Key | Value |
|---|---|
| `DATABASE_URL` | Supabase PostgreSQL connection string |
| `GROQ_API_KEY` | Your Groq API key |
| `GOOGLE_API_KEY` | Your Gemini API key (optional fallback) |
| `GMAIL_USER` | Your Gmail address |
| `GMAIL_APP_PASSWORD` | 16-character Gmail App Password |
| `FEEDBACK_TO` | Email to receive feedback |
| `CORS_ORIGINS` | `https://your-project.vercel.app` |

> `NEXT_PUBLIC_API_URL` is not needed — the frontend auto-detects the production backend URL.

### 3 — Push and deploy

```bash
git push origin main
```

Vercel auto-deploys on push. Tables are created automatically on first startup.

---

## How Data Isolation Works

- Every document, chat session, quiz result, and flashcard deck is stored with the user's `user_id`
- All list/fetch endpoints filter strictly by `user_id` — no cross-user leakage
- Session access is verified on the backend — users cannot read each other's chat messages
- In production (Supabase), all data persists permanently across devices and deployments

---

## API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Create account, sends OTP |
| POST | `/api/auth/login` | Login with email + password |
| POST | `/api/auth/verify-otp` | Verify email OTP |
| POST | `/api/auth/resend-otp` | Resend OTP |
| POST | `/api/auth/forgot-password` | Request password reset code |
| POST | `/api/auth/reset-password` | Reset password with code |

### Documents
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload` | Upload and index a file |
| GET | `/api/documents?user_id=` | List documents for a user |
| DELETE | `/api/documents/{doc_id}` | Delete a document and its embeddings |

### AI Features
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ask` | RAG Q&A (falls back to all docs if original doc unavailable) |
| POST | `/api/topics` | Extract document topics |
| POST | `/api/explain-topic` | Explain a specific topic in depth |
| POST | `/api/summary` | Generate structured document summary |
| POST | `/api/quiz` | Generate MCQ quiz |
| POST | `/api/flashcards` | Generate flashcard deck |

### History & Feedback
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST/GET/DELETE | `/api/chat/sessions` | Chat session management |
| GET | `/api/chat/sessions/{id}` | Load a session with all messages |
| POST/GET/DELETE | `/api/quiz-history` | Quiz result history |
| POST/GET/DELETE | `/api/flashcard-history` | Flashcard deck history |
| POST | `/api/feedback` | Submit feedback — delivered via Gmail to developer |

---

## LLM Provider Fallback

The app automatically tries multiple providers in order if one is rate-limited or unavailable:

```
Answer chain:  Groq 70B → Groq Scout 17B → Gemini Flash → Groq 8B
Simple chain:  Groq 8B  → Groq Scout 17B → Gemini Flash → Groq 70B
```

No configuration needed. Add keys for the providers you want available.

---

## Troubleshooting

**"Document not found" in old chat sessions**
The app automatically falls back to searching across all your uploaded documents.

**Emails not arriving**
Make sure `GMAIL_USER` and `GMAIL_APP_PASSWORD` are set correctly. The App Password must be generated from [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) — your regular Gmail password won't work.

**CORS error in browser**
Make sure the frontend origin is listed in `CORS_ORIGINS` in your `.env`.

**Port conflict on Windows**
Use `python -m uvicorn` instead of `uvicorn` to avoid the Windows launcher path issue.

**Data not persisting on Vercel**
`DATABASE_URL` must be set to a Supabase (or other hosted PostgreSQL) connection string. Without it, Vercel uses an ephemeral SQLite database that resets on every deployment.
