import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { generateQuiz, saveQuizResult, getQuizHistory, clearQuizHistory } from "../services/api";
import toast from "react-hot-toast";
import GeneratingLoader from "./GeneratingLoader";
import {
  FiAward, FiRefreshCw, FiCheckCircle, FiXCircle,
  FiClock, FiTrash2, FiTrendingUp, FiList, FiZap,
  FiEye, FiChevronDown,
} from "react-icons/fi";

const QUIZ_STEPS = [
  "Scanning your study material…",
  "Selecting varied topics…",
  "Crafting exam questions…",
  "Writing answer explanations…",
  "Finalizing your quiz…",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function scoreColor(pct) {
  if (pct >= 80) return { text: "#34d399", bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.3)" };
  if (pct >= 60) return { text: "#fbbf24", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)" };
  return { text: "#f87171", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.25)" };
}

function scoreMsg(pct) {
  if (pct === 100) return "Perfect score!";
  if (pct >= 80)   return "Excellent work!";
  if (pct >= 60)   return "Good effort — review the explanations.";
  if (pct >= 40)   return "Keep studying — you're getting there!";
  return "Need more revision — go through your notes.";
}

// ── Option button ─────────────────────────────────────────────────────────────

function OptionBtn({ optKey, value, answered, correct, chosen, onPick }) {
  let bg, border, text, icon = null;
  if (!answered) {
    bg = "rgba(255,255,255,0.02)"; border = "rgba(255,255,255,0.07)"; text = "#d1d5db";
  } else if (optKey === correct) {
    bg = "rgba(16,185,129,0.12)"; border = "rgba(16,185,129,0.45)"; text = "#6ee7b7";
    icon = <FiCheckCircle size={13} className="flex-shrink-0 text-emerald-400" />;
  } else if (optKey === chosen) {
    bg = "rgba(239,68,68,0.1)"; border = "rgba(239,68,68,0.4)"; text = "#fca5a5";
    icon = <FiXCircle size={13} className="flex-shrink-0 text-red-400" />;
  } else {
    bg = "rgba(255,255,255,0.01)"; border = "rgba(255,255,255,0.04)"; text = "#6b7280";
  }

  return (
    <motion.button
      whileHover={!answered ? { x: 4 } : {}}
      whileTap={!answered ? { scale: 0.99 } : {}}
      onClick={() => !answered && onPick(optKey)}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm text-left transition-all duration-150"
      style={{ background: bg, borderColor: border, color: text, cursor: answered ? "default" : "pointer" }}
    >
      <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0"
        style={{
          background: answered && optKey === correct ? "rgba(16,185,129,0.25)" : "rgba(255,255,255,0.05)",
          color: answered && optKey === correct ? "#34d399" : "#6b7280",
        }}>
        {optKey}
      </span>
      <span className="flex-1 leading-relaxed">{value}</span>
      {icon}
    </motion.button>
  );
}

// ── Single question card ──────────────────────────────────────────────────────

function QuestionCard({ q, index, userAnswer, onAnswer, total }) {
  const answered = userAnswer !== undefined;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="rounded-2xl p-5 space-y-4"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: answered
          ? userAnswer === q.correct_answer
            ? "1px solid rgba(16,185,129,0.2)"
            : "1px solid rgba(239,68,68,0.18)"
          : "1px solid rgba(124,58,237,0.14)",
      }}
    >
      {/* Question */}
      <div className="flex gap-3 items-start">
        <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
          style={{ background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.3)", color: "#a78bfa" }}>
          {index + 1}
        </span>
        <p className="text-sm font-medium text-gray-100 leading-relaxed">{q.question}</p>
      </div>

      {/* Options */}
      <div className="space-y-2 pl-2 sm:pl-10">
        {Object.entries(q.options).map(([k, v]) => (
          <OptionBtn
            key={k} optKey={k} value={v}
            answered={answered} correct={q.correct_answer} chosen={userAnswer}
            onPick={(key) => onAnswer(index, key)}
          />
        ))}
      </div>

      {/* Explanation */}
      <AnimatePresence>
        {answered && q.explanation && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }} className="pl-10 overflow-hidden"
          >
            <div className="p-3.5 rounded-xl text-xs text-gray-400 leading-relaxed"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <span className="text-gray-200 font-semibold">Explanation: </span>
              {q.explanation}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Score card ────────────────────────────────────────────────────────────────

function ScoreCard({ score, total, onNewQuiz, onRetry }) {
  const pct = Math.round((score / total) * 100);
  const clr = scoreColor(pct);
  const circumference = 2 * Math.PI * 22;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="rounded-2xl p-6"
      style={{
        background: `linear-gradient(135deg, ${clr.bg}, rgba(0,0,0,0))`,
        border: `1px solid ${clr.border}`,
        boxShadow: `0 0 30px ${clr.bg}`,
      }}
    >
      <div className="flex items-center gap-5">
        {/* Circle */}
        <div className="relative w-16 h-16 flex-shrink-0">
          <svg className="w-16 h-16 -rotate-90" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="22" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3.5" />
            <motion.circle
              cx="24" cy="24" r="22" fill="none"
              stroke={clr.text} strokeWidth="3.5" strokeLinecap="round"
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: circumference - (pct / 100) * circumference }}
              transition={{ duration: 1, ease: "easeOut" }}
              style={{ strokeDasharray: circumference, filter: `drop-shadow(0 0 4px ${clr.text})` }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold" style={{ color: clr.text }}>{pct}%</span>
          </div>
        </div>

        <div className="flex-1">
          <p className="text-lg font-bold text-white">{score} / {total} correct</p>
          <p className="text-xs mt-0.5" style={{ color: clr.text }}>{scoreMsg(pct)}</p>
        </div>
      </div>

      <div className="flex gap-2.5 mt-5">
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={onRetry}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#9ca3af" }}
        >
          <FiRefreshCw size={13} /> Retry Same
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={onNewQuiz}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 btn-glow"
        >
          <FiZap size={13} /> New Quiz
        </motion.button>
      </div>
    </motion.div>
  );
}

// ── History Q&A review ────────────────────────────────────────────────────────

function QuizReview({ questions, userAnswers }) {
  if (!questions?.length) {
    return (
      <p className="text-xs text-gray-600 py-4 text-center">
        Questions not saved for this attempt. Take the quiz again to record them.
      </p>
    );
  }
  return (
    <div className="space-y-3 pt-1">
      {questions.map((q, i) => {
        const chosen  = userAnswers?.[i];
        const correct = q.correct_answer;
        const gotIt   = chosen === correct;
        return (
          <div key={i} className="rounded-xl p-4 space-y-2.5"
            style={{
              background: gotIt ? "rgba(16,185,129,0.05)" : "rgba(239,68,68,0.05)",
              border: `1px solid ${gotIt ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.18)"}`,
            }}>
            {/* Question */}
            <div className="flex gap-2.5 items-start">
              <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5"
                style={{ background: "rgba(124,58,237,0.2)", color: "#a78bfa" }}>
                {i + 1}
              </span>
              <p className="text-xs font-medium text-gray-200 leading-relaxed">{q.question}</p>
              {gotIt
                ? <FiCheckCircle size={13} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                : <FiXCircle    size={13} className="text-red-400 flex-shrink-0 mt-0.5" />}
            </div>

            {/* Answers */}
            <div className="pl-7 space-y-1">
              {/* Correct answer */}
              <div className="flex items-center gap-2 text-[11px]"
                style={{ color: "#34d399" }}>
                <FiCheckCircle size={10} />
                <span className="font-semibold">Correct:</span>
                <span>{correct} — {q.options?.[correct]}</span>
              </div>
              {/* User's wrong answer */}
              {!gotIt && chosen && (
                <div className="flex items-center gap-2 text-[11px]"
                  style={{ color: "#f87171" }}>
                  <FiXCircle size={10} />
                  <span className="font-semibold">Your answer:</span>
                  <span>{chosen} — {q.options?.[chosen]}</span>
                </div>
              )}
              {!gotIt && !chosen && (
                <div className="text-[11px] text-gray-600">Not answered</div>
              )}
            </div>

            {/* Explanation */}
            {q.explanation && (
              <p className="pl-7 text-[11px] text-gray-500 leading-relaxed">{q.explanation}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── History entry ─────────────────────────────────────────────────────────────

function HistoryEntry({ entry, onRetake, index }) {
  const [expanded, setExpanded] = useState(false);
  const pct = entry.pct;
  const clr = scoreColor(pct);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-xl overflow-hidden"
      style={{ border: "1px solid rgba(255,255,255,0.06)" }}
    >
      {/* Summary row */}
      <div className="flex items-center gap-3 p-3 sm:p-4"
        style={{ background: "rgba(255,255,255,0.02)" }}>

        {/* Score badge */}
        <div className="w-14 h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
          style={{ background: clr.bg, border: `1px solid ${clr.border}` }}>
          <span className="text-base font-bold" style={{ color: clr.text }}>{pct}%</span>
          <span className="text-[9px] font-medium mt-0.5" style={{ color: clr.text }}>
            {entry.score}/{entry.total}
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-200 truncate">{entry.docName}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <FiClock size={9} className="text-gray-600" />
            <span className="text-[10px] text-gray-600">{timeAgo(entry.date)}</span>
            <span className="text-[10px] text-gray-700">·</span>
            <span className="text-[10px] text-gray-600">{entry.total} questions</span>
          </div>
          <div className="h-1 mt-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: clr.text }} />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-150"
            style={expanded ? {
              background: "rgba(59,130,246,0.18)", border: "1px solid rgba(59,130,246,0.4)", color: "#93c5fd",
            } : {
              background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", color: "#60a5fa",
            }}
          >
            <FiEye size={11} />
            View Quiz
            <FiChevronDown size={10} style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={() => onRetake(entry)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium"
            style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", color: "#c4b5fd" }}
          >
            <FiRefreshCw size={10} />
            Retake
          </motion.button>
        </div>
      </div>

      {/* Expandable Q&A review */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-3 sm:px-4 pb-4"
              style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-600 pt-3 pb-2">
                Quiz Review — {entry.score}/{entry.total} correct
              </p>
              <QuizReview questions={entry.questions} userAnswers={entry.userAnswers} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getUserId() {
  try { return JSON.parse(localStorage.getItem("studymate_auth"))?.id || null; }
  catch { return null; }
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function QuizPanel({ selectedDocId, documents, genJob, onGenerate }) {
  const [tab,         setTab]         = useState("quiz");
  const [quiz,        setQuiz]        = useState(null);
  const [numQ,        setNumQ]        = useState(5);
  const [userAnswers, setUserAnswers] = useState({});
  const [history,     setHistory]     = useState([]);
  const [saved,       setSaved]       = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loading = genJob?.status === "loading";
  const doc     = documents.find((d) => d.doc_id === selectedDocId);
  const hasDoc  = documents.length > 0;

  // Sync result from background job into local quiz state
  useEffect(() => {
    if (genJob?.status === "done" && genJob.result) {
      setQuiz(genJob.result);
      toast.success(`${genJob.result.num_questions} questions ready!`);
    }
    if (genJob?.status === "error") {
      toast.error(genJob.error || "Quiz generation failed.");
    }
  }, [genJob?.status]); // eslint-disable-line

  const answeredCount = Object.keys(userAnswers).length;
  const correctCount  = quiz
    ? Object.entries(userAnswers).filter(([i, k]) => k === quiz.questions[Number(i)]?.correct_answer).length
    : 0;
  const allDone = quiz && answeredCount === quiz.num_questions;

  // Load history from server on mount
  useEffect(() => {
    const uid = getUserId();
    if (!uid) return;
    setHistoryLoading(true);
    getQuizHistory(uid)
      .then((data) => setHistory(data || []))
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, []);

  // Auto-save to server when quiz is completed
  useEffect(() => {
    if (allDone && !saved && quiz) {
      const uid = getUserId();
      if (!uid) return;
      const entry = {
        docId:       quiz.doc_id,
        docName:     doc?.name || "Document",
        score:       correctCount,
        total:       quiz.num_questions,
        pct:         Math.round((correctCount / quiz.num_questions) * 100),
        questions:   quiz.questions,
        userAnswers: { ...userAnswers },
      };
      setSaved(true);
      saveQuizResult(uid, entry)
        .then((res) => {
          const saved = { ...entry, id: res.id, date: new Date().toISOString() };
          setHistory((prev) => [saved, ...prev].slice(0, 50));
        })
        .catch(() => {});
    }
  }, [allDone]); // eslint-disable-line

  const handleGenerate = (overrideDocId) => {
    const docId = overrideDocId || selectedDocId;
    if (!docId) { toast.error("Select a document first."); return; }
    setQuiz(null);
    setUserAnswers({});
    setSaved(false);
    setTab("quiz");
    onGenerate(docId, () => generateQuiz(docId, numQ));
  };

  const handleRetry = () => {
    setUserAnswers({});
    setSaved(false);
    // re-shuffle the same questions by resetting answers
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRetake = (entry) => {
    handleGenerate(entry.docId);
  };

  const clearHistory = () => {
    const uid = getUserId();
    setHistory([]);
    if (uid) clearQuizHistory(uid).catch(() => {});
    toast.success("History cleared.");
  };

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg md:text-xl font-bold text-white">Quiz Generator</h2>
          {doc && <p className="text-xs text-gray-600 mt-0.5 truncate">{doc.name}</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <select
            value={numQ}
            onChange={(e) => setNumQ(Number(e.target.value))}
            className="bg-dark-800 border border-purple-900/30 text-gray-300 text-xs rounded-xl
                       px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-600/40"
          >
            {[3, 5, 8, 10, 15].map((n) => (
              <option key={n} value={n}>{n} Questions</option>
            ))}
          </select>
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => handleGenerate()}
            disabled={loading || !hasDoc || !selectedDocId}
            className="btn-glow px-5 py-2.5 text-sm flex items-center gap-2"
          >
            {loading ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating…</>
            ) : (
              <><FiZap size={13} /> {quiz ? "New Quiz" : "Generate Quiz"}</>
            )}
          </motion.button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-xl w-fit"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
        {[
          { id: "quiz",    icon: FiAward,    label: "Take Quiz" },
          { id: "history", icon: FiList,     label: `History${history.length ? ` (${history.length})` : ""}` },
        ].map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200"
            style={tab === id ? {
              background: "rgba(124,58,237,0.25)",
              border: "1px solid rgba(124,58,237,0.4)",
              color: "#c4b5fd",
              boxShadow: "0 0 12px rgba(124,58,237,0.15)",
            } : {
              background: "transparent",
              border: "1px solid transparent",
              color: "#6b7280",
            }}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      {/* ── QUIZ TAB ── */}
      <AnimatePresence mode="wait">
        {tab === "quiz" && (
          <motion.div key="quiz" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="space-y-4">

            {/* Empty state */}
            {!quiz && !loading && (
              <div className="flex flex-col items-center py-20 text-center">
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
                  style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)", boxShadow: "0 0 30px rgba(124,58,237,0.08)" }}>
                  <FiAward className="text-purple-400 text-3xl" />
                </div>
                <h3 className="text-lg font-semibold text-gray-300 mb-2">AI Quiz Generator</h3>
                <p className="text-gray-600 text-sm max-w-xs mb-8">
                  {!hasDoc ? "Upload a document first, then generate a quiz." :
                   !selectedDocId ? "Select a document from the sidebar." :
                   "Generate unique AI-powered MCQs from your study material. Every quiz is different!"}
                </p>
                {hasDoc && selectedDocId && (
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={() => handleGenerate()} className="btn-glow px-6 py-3 flex items-center gap-2">
                    <FiTrendingUp size={14} /> Generate Quiz
                  </motion.button>
                )}
              </div>
            )}

            {/* Loading */}
            {loading && (
              <GeneratingLoader
                steps={QUIZ_STEPS}
                intervalMs={3000}
                title="Generating your quiz…"
                subtitle="Creating unique questions from your material"
              />
            )}

            {/* Active quiz */}
            {quiz && !loading && (
              <>
                {/* Progress bar */}
                {!allDone && (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                      <motion.div className="h-full rounded-full"
                        style={{ background: "linear-gradient(90deg, #7c3aed, #3b82f6)" }}
                        animate={{ width: `${(answeredCount / quiz.num_questions) * 100}%` }}
                        transition={{ duration: 0.3 }} />
                    </div>
                    <span className="text-xs text-gray-600 flex-shrink-0">
                      {answeredCount} / {quiz.num_questions} answered
                    </span>
                  </div>
                )}

                {/* Score card */}
                {allDone && (
                  <ScoreCard
                    score={correctCount} total={quiz.num_questions}
                    onNewQuiz={() => handleGenerate()}
                    onRetry={handleRetry}
                  />
                )}

                {/* Questions */}
                <div className="space-y-3">
                  {quiz.questions.map((q, i) => (
                    <QuestionCard
                      key={i} q={q} index={i} total={quiz.num_questions}
                      userAnswer={userAnswers[i]}
                      onAnswer={(idx, key) => setUserAnswers((p) => ({ ...p, [idx]: key }))}
                    />
                  ))}
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* ── HISTORY TAB ── */}
        {tab === "history" && (
          <motion.div key="history" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="space-y-3">

            {historyLoading ? (
              <div className="flex items-center justify-center py-20 gap-3">
                <span className="w-5 h-5 border-2 border-purple-500/30 border-t-purple-400 rounded-full animate-spin" />
                <span className="text-sm text-gray-500">Loading history…</span>
              </div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center py-20 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <FiList className="text-gray-600 text-2xl" />
                </div>
                <h3 className="text-base font-semibold text-gray-500 mb-1">No quiz history yet</h3>
                <p className="text-gray-700 text-sm">Complete a quiz and your score will appear here.</p>
              </div>
            ) : (
              <>
                {/* Header row */}
                <div className="flex items-center justify-between pb-1">
                  <span className="text-xs text-gray-600 font-medium">{history.length} attempt{history.length !== 1 ? "s" : ""}</span>
                  <button onClick={clearHistory}
                    className="flex items-center gap-1.5 text-[11px] text-gray-700 hover:text-red-400 transition-colors">
                    <FiTrash2 size={10} /> Clear All
                  </button>
                </div>

                {/* Entries */}
                {history.map((entry, i) => (
                  <HistoryEntry key={entry.id} entry={entry} index={i} onRetake={handleRetake} />
                ))}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
