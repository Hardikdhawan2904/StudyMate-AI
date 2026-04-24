/**
 * API Service
 * All calls to the FastAPI backend go through this module.
 */

import axios from "axios";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" && window.location.hostname !== "localhost"
    ? "https://studymateai-one.vercel.app/_/backend"
    : "http://localhost:8000");

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 120000, // 2 min — LLM calls can be slow
});

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function authSignup(name, email, password) {
  const res = await api.post("/api/auth/signup", { name, email, password });
  return res.data;
}

export async function authLogin(email, password) {
  const res = await api.post("/api/auth/login", { email, password });
  return res.data;
}

export async function authVerifyOtp(email, otp) {
  const res = await api.post("/api/auth/verify-otp", { email, otp });
  return res.data;
}

export async function authResendOtp(email) {
  const res = await api.post("/api/auth/resend-otp", { email });
  return res.data;
}

export async function authForgotPassword(email) {
  const res = await api.post("/api/auth/forgot-password", { email });
  return res.data;
}

export async function authResetPassword(email, token, new_password) {
  const res = await api.post("/api/auth/reset-password", { email, token, new_password });
  return res.data;
}

// ── Chat History ──────────────────────────────────────────────────────────────

export async function createChatSession(user_id, doc_id, title) {
  const res = await api.post("/api/chat/sessions", { user_id, doc_id, title });
  return res.data;
}

export async function listChatSessions(user_id) {
  const res = await api.get("/api/chat/sessions", { params: { user_id } });
  return res.data;
}

export async function getChatSession(session_id) {
  const res = await api.get(`/api/chat/sessions/${session_id}`);
  return res.data;
}

export async function addChatMessage(session_id, role, content, sources = []) {
  const res = await api.post(`/api/chat/sessions/${session_id}/messages`, { role, content, sources });
  return res.data;
}

export async function deleteChatSession(session_id) {
  const res = await api.delete(`/api/chat/sessions/${session_id}`);
  return res.data;
}

// ── Documents ─────────────────────────────────────────────────────────────────

export async function uploadDocument(file, onProgress, userId = 0) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("user_id", String(userId));

  const response = await api.post("/api/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded * 100) / e.total));
      }
    },
  });
  return response.data;
}

export async function listDocuments(userId = 0) {
  const response = await api.get("/api/documents", { params: { user_id: userId } });
  return response.data.documents;
}

export async function deleteDocument(docId) {
  const response = await api.delete(`/api/documents/${docId}`);
  return response.data;
}

// ── Q&A ───────────────────────────────────────────────────────────────────────

export async function askQuestion(question, docId = null, k = 15) {
  const response = await api.post("/api/ask", { question, doc_id: docId, k });
  return response.data;
}

// ── Topics ───────────────────────────────────────────────────────────────────

export async function getDocumentTopics(docId) {
  const response = await api.post("/api/topics", { doc_id: docId });
  return response.data;
}

export async function explainTopic(docId, title, parentTopic, index, total) {
  const response = await api.post("/api/explain-topic", {
    doc_id: docId, title, parent_topic: parentTopic || null, index, total,
  });
  return response.data;
}

// ── Summary ───────────────────────────────────────────────────────────────────

export async function generateSummary(docId) {
  const response = await api.post("/api/summary", { doc_id: docId });
  return response.data;
}

// ── Quiz ─────────────────────────────────────────────────────────────────────

export async function generateQuiz(docId, numQuestions = 5) {
  const response = await api.post("/api/quiz", {
    doc_id: docId,
    num_questions: numQuestions,
    seed: Math.floor(Math.random() * 99999),
  });
  return response.data;
}

// ── Flashcards ────────────────────────────────────────────────────────────────

export async function generateFlashcards(docId, numCards = 10) {
  const response = await api.post("/api/flashcards", {
    doc_id: docId,
    num_cards: numCards,
  });
  return response.data;
}

// ── Flashcard History (server-synced) ────────────────────────────────────────

export async function saveFlashcardDeck(userId, entry) {
  const res = await api.post("/api/flashcard-history", {
    user_id: userId,
    doc_id: entry.docId || null,
    doc_name: entry.docName || "Document",
    num_cards: entry.numCards,
    cards: entry.cards || [],
  });
  return res.data;
}

export async function getFlashcardHistory(userId) {
  const res = await api.get("/api/flashcard-history", { params: { user_id: userId } });
  return res.data;
}

export async function clearFlashcardHistory(userId) {
  const res = await api.delete("/api/flashcard-history", { params: { user_id: userId } });
  return res.data;
}

// ── Quiz History (server-synced) ──────────────────────────────────────────────

export async function saveQuizResult(userId, entry) {
  const res = await api.post("/api/quiz-history", {
    user_id: userId,
    doc_id: entry.docId || null,
    doc_name: entry.docName || "Document",
    score: entry.score,
    total: entry.total,
    pct: entry.pct,
    questions: entry.questions || [],
    user_answers: entry.userAnswers || {},
  });
  return res.data;
}

export async function getQuizHistory(userId) {
  const res = await api.get("/api/quiz-history", { params: { user_id: userId } });
  return res.data;
}

export async function clearQuizHistory(userId) {
  const res = await api.delete("/api/quiz-history", { params: { user_id: userId } });
  return res.data;
}

// ── Feedback ──────────────────────────────────────────────────────────────────

export async function sendFeedback(name, email, type, message) {
  const res = await api.post("/api/feedback", { name, email, type, message });
  return res.data;
}

// ── Health ────────────────────────────────────────────────────────────────────

export async function checkHealth() {
  const response = await api.get("/health");
  return response.data;
}

export default api;
