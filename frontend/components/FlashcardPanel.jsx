import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { generateFlashcards, saveFlashcardDeck, getFlashcardHistory, clearFlashcardHistory } from "../services/api";
import toast from "react-hot-toast";
import GeneratingLoader from "./GeneratingLoader";
import {
  FiLayers, FiRefreshCw, FiChevronLeft, FiChevronRight,
  FiRotateCcw, FiCheck, FiEye, FiEyeOff, FiGrid, FiSquare,
  FiList, FiTrash2, FiClock,
} from "react-icons/fi";

const FLASHCARD_STEPS = [
  "Reading your study material…",
  "Identifying key concepts…",
  "Writing question cards…",
  "Crafting detailed answers…",
  "Preparing your deck…",
];

function getUserId() {
  try { return JSON.parse(localStorage.getItem("studymate_auth"))?.id || null; }
  catch { return null; }
}

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── 3D Flip Card ──────────────────────────────────────────────────────────────

function FlipCard({ front, back, isFlipped, onFlip, isKnown }) {
  return (
    <div className="relative w-full select-none" style={{ perspective: "1200px" }}>
      <motion.div
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformStyle: "preserve-3d", position: "relative", height: "clamp(200px, 35vw, 260px)" }}
      >
        {/* Front */}
        <div
          className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center p-8 text-center cursor-pointer"
          style={{
            backfaceVisibility: "hidden",
            background: "linear-gradient(135deg, rgba(124,58,237,0.12), rgba(59,130,246,0.06))",
            border: `1px solid ${isKnown ? "rgba(16,185,129,0.35)" : "rgba(124,58,237,0.28)"}`,
            boxShadow: isKnown
              ? "0 0 28px rgba(16,185,129,0.1), 0 8px 32px rgba(0,0,0,0.4)"
              : "0 0 28px rgba(124,58,237,0.1), 0 8px 32px rgba(0,0,0,0.4)",
          }}
          onClick={onFlip}
        >
          <div className="mb-4 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest"
            style={{ background: "rgba(124,58,237,0.2)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.3)" }}>
            Question
          </div>
          <p className="text-base font-semibold text-gray-100 leading-relaxed">{front}</p>
          {isKnown && (
            <div className="mt-4 flex items-center gap-1.5 text-emerald-400 text-xs">
              <FiCheck size={12} /> <span>Marked as known</span>
            </div>
          )}
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center p-8 text-center cursor-pointer"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            background: "linear-gradient(135deg, rgba(59,130,246,0.14), rgba(124,58,237,0.08))",
            border: "1px solid rgba(59,130,246,0.32)",
            boxShadow: "0 0 28px rgba(59,130,246,0.12), 0 8px 32px rgba(0,0,0,0.4)",
          }}
          onClick={onFlip}
        >
          <div className="mb-4 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest"
            style={{ background: "rgba(59,130,246,0.2)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.3)" }}>
            Answer
          </div>
          <p className="text-sm text-gray-200 leading-relaxed">{back}</p>
        </div>
      </motion.div>
    </div>
  );
}

// ── Browse All grid card ──────────────────────────────────────────────────────

function BrowseCard({ card, index, isKnown, onJump }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="rounded-xl overflow-hidden cursor-pointer"
      style={{
        border: isKnown ? "1px solid rgba(16,185,129,0.25)" : "1px solid rgba(124,58,237,0.15)",
        background: isKnown ? "rgba(16,185,129,0.04)" : "rgba(124,58,237,0.04)",
      }}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start gap-3 px-4 py-3.5">
        <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5"
          style={{ background: "rgba(124,58,237,0.2)", color: "#a78bfa" }}>
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-200 leading-relaxed">{card.front}</p>
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-2 pt-2 text-xs text-gray-400 leading-relaxed"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  {card.back}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isKnown && <FiCheck size={11} className="text-emerald-400" />}
          <button
            onClick={(e) => { e.stopPropagation(); onJump(index); }}
            className="text-[10px] px-2 py-0.5 rounded-md"
            style={{ background: "rgba(124,58,237,0.15)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.25)" }}
          >
            Study
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── History entry ─────────────────────────────────────────────────────────────

function HistoryEntry({ entry, index, onReStudy }) {
  const [expanded, setExpanded] = useState(false);

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

        {/* Badge */}
        <div className="w-14 h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
          style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.3)" }}>
          <span className="text-base font-bold text-purple-300">{entry.numCards}</span>
          <span className="text-[9px] font-medium mt-0.5 text-purple-500">cards</span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-200 truncate">{entry.docName}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <FiClock size={9} className="text-gray-600" />
            <span className="text-[10px] text-gray-600">{timeAgo(entry.date)}</span>
          </div>
          <div className="h-1 mt-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
            <div className="h-full rounded-full" style={{ width: "100%", background: "linear-gradient(90deg, #7c3aed, #3b82f6)" }} />
          </div>
        </div>

        {/* Buttons */}
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
            <FiEye size={11} /> View
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={() => onReStudy(entry)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium"
            style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", color: "#c4b5fd" }}
          >
            <FiRefreshCw size={10} /> Re-study
          </motion.button>
        </div>
      </div>

      {/* Expandable card list */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-3 sm:px-4 pb-4 space-y-2"
              style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-600 pt-3 pb-1">
                {entry.numCards} Cards in this deck
              </p>
              {entry.cards.map((c, i) => (
                <div key={i} className="rounded-lg px-3 py-2.5 space-y-1"
                  style={{ background: "rgba(124,58,237,0.05)", border: "1px solid rgba(124,58,237,0.12)" }}>
                  <p className="text-xs font-medium text-gray-200">{c.front}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{c.back}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function FlashcardPanel({ selectedDocId, documents, genJob, onGenerate }) {
  const [tab,     setTab]     = useState("study");
  const [cards,   setCards]   = useState([]);
  const [numCards, setNumCards] = useState(10);
  const [index,   setIndex]   = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known,   setKnown]   = useState(new Set());
  const [view,    setView]    = useState("study"); // "study" | "browse"

  const [history,        setHistory]        = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loading = genJob?.status === "loading";
  const doc     = documents.find((d) => d.doc_id === selectedDocId);
  const hasDoc  = documents.length > 0;
  const card    = cards[index];

  // Load history from server on mount
  useEffect(() => {
    const uid = getUserId();
    if (!uid) return;
    setHistoryLoading(true);
    getFlashcardHistory(uid)
      .then((data) => setHistory(data || []))
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, []);

  // Sync result from background job — use ref to fire toast only once per job
  const lastNotifiedJobRef = useRef(null);
  useEffect(() => {
    const jobKey = `${genJob?.status}_${genJob?.timestamp}`;
    if (jobKey === lastNotifiedJobRef.current) return;
    if (genJob?.status === "done" && genJob.result?.flashcards) {
      lastNotifiedJobRef.current = jobKey;
      const newCards = genJob.result.flashcards;
      setCards(newCards);
      toast.success(`${genJob.result.num_cards} flashcards ready!`);

      // Auto-save deck to server history
      const uid = getUserId();
      if (uid && newCards.length > 0) {
        const entry = {
          docId: selectedDocId,
          docName: doc?.name || "Document",
          numCards: newCards.length,
          cards: newCards,
        };
        saveFlashcardDeck(uid, entry)
          .then((res) => {
            const saved = { ...entry, id: res.id, date: new Date().toISOString() };
            setHistory((prev) => [saved, ...prev].slice(0, 30));
          })
          .catch(() => {});
      }
    }
    if (genJob?.status === "error") {
      lastNotifiedJobRef.current = jobKey;
      toast.error(genJob.error || "Generation failed.");
    }
  }, [genJob?.status, genJob?.timestamp]); // eslint-disable-line

  const handleGenerate = () => {
    if (!selectedDocId) { toast.error("Select a document first."); return; }
    setCards([]);
    setIndex(0);
    setFlipped(false);
    setKnown(new Set());
    setView("study");
    onGenerate(selectedDocId, () => generateFlashcards(selectedDocId, numCards));
  };

  const handleReStudy = (entry) => {
    setCards(entry.cards);
    setIndex(0);
    setFlipped(false);
    setKnown(new Set());
    setView("study");
    setTab("study");
    toast.success(`Loaded ${entry.cards.length} cards from history`);
  };

  const handleClearHistory = () => {
    const uid = getUserId();
    setHistory([]);
    if (uid) clearFlashcardHistory(uid).catch(() => {});
    toast.success("History cleared.");
  };

  const navigate = (dir) => {
    const next = index + dir;
    if (next < 0 || next >= cards.length) return;
    setFlipped(false);
    setTimeout(() => setIndex(next), 60);
  };

  const jumpTo = (i) => {
    setFlipped(false);
    setView("study");
    setTimeout(() => setIndex(i), 60);
  };

  const markKnown = () => {
    setKnown((prev) => {
      const n = new Set(prev);
      n.has(index) ? n.delete(index) : n.add(index);
      return n;
    });
  };

  const reset = () => {
    setIndex(0);
    setFlipped(false);
    setKnown(new Set());
  };

  const knownPct = cards.length ? Math.round((known.size / cards.length) * 100) : 0;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg md:text-xl font-bold text-white">Flashcards</h2>
          {doc && <p className="text-xs text-gray-600 mt-0.5 truncate">{doc.name}</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <select
            value={numCards}
            onChange={(e) => setNumCards(Number(e.target.value))}
            className="bg-dark-800 border border-purple-900/30 text-gray-300 text-xs rounded-xl
                       px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-600/40"
          >
            {[5, 10, 15, 20, 30].map((n) => (
              <option key={n} value={n}>{n} Cards</option>
            ))}
          </select>
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={handleGenerate}
            disabled={loading || !hasDoc || !selectedDocId}
            className="btn-glow px-5 py-2.5 text-sm flex items-center gap-2"
          >
            {loading ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating…</>
            ) : (
              <>{cards.length ? <FiRefreshCw size={13} /> : <FiLayers size={13} />} {cards.length ? "New Deck" : "Generate"}</>
            )}
          </motion.button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-xl w-fit"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
        {[
          { id: "study",   icon: FiLayers, label: "Study" },
          { id: "history", icon: FiList,   label: `History${history.length ? ` (${history.length})` : ""}` },
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
            <Icon size={12} /> {label}
          </button>
        ))}
      </div>

      {/* ── STUDY TAB ── */}
      <AnimatePresence mode="wait">
        {tab === "study" && (
          <motion.div key="study-tab" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="space-y-4">

            {/* View toggle — only when cards exist */}
            {cards.length > 0 && !loading && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                      <motion.div className="h-full rounded-full bg-emerald-500"
                        animate={{ width: `${knownPct}%` }} transition={{ duration: 0.4 }} />
                    </div>
                    <span className="text-[11px] text-emerald-400 font-medium">{known.size}/{cards.length} known</span>
                  </div>
                </div>
                <div className="flex gap-1 p-0.5 rounded-lg" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  {[
                    { id: "study",  icon: FiSquare, label: "Study" },
                    { id: "browse", icon: FiGrid,   label: "Browse All" },
                  ].map(({ id, icon: Icon, label }) => (
                    <button key={id} onClick={() => setView(id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-all duration-150"
                      style={view === id ? {
                        background: "rgba(124,58,237,0.25)", color: "#c4b5fd",
                        border: "1px solid rgba(124,58,237,0.35)",
                      } : {
                        background: "transparent", color: "#6b7280",
                        border: "1px solid transparent",
                      }}>
                      <Icon size={11} /> {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {!card && !loading && (
              <div className="flex flex-col items-center py-20 text-center">
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
                  style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)", boxShadow: "0 0 30px rgba(124,58,237,0.08)" }}>
                  <FiLayers className="text-purple-500 text-3xl" />
                </div>
                <h3 className="text-lg font-semibold text-gray-300 mb-2">Flashcard Study Mode</h3>
                <p className="text-gray-600 text-sm max-w-xs mb-8">
                  {!hasDoc ? "Upload a document, then generate flashcards to start studying." :
                   !selectedDocId ? "Select a document from the sidebar." :
                   "Click Generate to create flip cards from your study material."}
                </p>
                {hasDoc && selectedDocId && (
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={handleGenerate} className="btn-glow px-6 py-3 flex items-center gap-2">
                    <FiLayers size={14} /> Generate Flashcards
                  </motion.button>
                )}
              </div>
            )}

            {/* Loading */}
            {loading && (
              <GeneratingLoader
                steps={FLASHCARD_STEPS}
                intervalMs={3200}
                title="Creating your flashcard deck…"
                subtitle="Writing questions and answers from your notes"
              />
            )}

            {/* Study view */}
            <AnimatePresence mode="wait">
              {card && !loading && view === "study" && (
                <motion.div key="sv" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="max-w-lg mx-auto space-y-4">

                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>Card {index + 1} of {cards.length}</span>
                    <span className="text-emerald-400">{known.size} known · {cards.length - known.size} left</span>
                  </div>

                  <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <motion.div className="h-full rounded-full"
                      style={{ background: "linear-gradient(90deg, #7c3aed, #3b82f6)" }}
                      animate={{ width: `${((index + 1) / cards.length) * 100}%` }}
                      transition={{ duration: 0.3 }} />
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.div key={index} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18 }}>
                      <FlipCard
                        front={card.front} back={card.back}
                        isFlipped={flipped} onFlip={() => setFlipped(!flipped)}
                        isKnown={known.has(index)}
                      />
                    </motion.div>
                  </AnimatePresence>

                  <motion.button
                    whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.97 }}
                    onClick={() => setFlipped(!flipped)}
                    className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2.5 transition-all duration-200"
                    style={flipped ? {
                      background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.38)",
                      color: "#93c5fd", boxShadow: "0 0 16px rgba(59,130,246,0.1)",
                    } : {
                      background: "linear-gradient(135deg, rgba(124,58,237,0.25), rgba(124,58,237,0.12))",
                      border: "1px solid rgba(124,58,237,0.48)", color: "#c4b5fd",
                      boxShadow: "0 0 20px rgba(124,58,237,0.15)",
                    }}
                  >
                    {flipped ? <><FiEyeOff size={15} /> Hide Answer</> : <><FiEye size={15} /> Show Answer</>}
                  </motion.button>

                  <div className="flex items-center justify-center gap-2 sm:gap-2.5 flex-wrap">
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      onClick={() => navigate(-1)} disabled={index === 0}
                      className="w-11 h-11 rounded-xl btn-ghost border border-white/[0.06] justify-center disabled:opacity-30">
                      <FiChevronLeft size={20} />
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      onClick={markKnown}
                      className="px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all duration-200"
                      style={known.has(index) ? {
                        background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.35)", color: "#34d399",
                      } : {
                        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#9ca3af",
                      }}
                    >
                      <FiCheck size={13} />
                      {known.has(index) ? "Known ✓" : "Mark Known"}
                    </motion.button>

                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      onClick={reset} title="Reset deck"
                      className="w-11 h-11 rounded-xl btn-ghost border border-white/[0.06] justify-center">
                      <FiRotateCcw size={18} />
                    </motion.button>

                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      onClick={() => navigate(1)} disabled={index === cards.length - 1}
                      className="w-11 h-11 rounded-xl btn-ghost border border-white/[0.06] justify-center disabled:opacity-30">
                      <FiChevronRight size={20} />
                    </motion.button>
                  </div>

                  <div className="flex gap-1.5 justify-center flex-wrap pt-1">
                    {cards.map((_, i) => (
                      <button key={i} onClick={() => jumpTo(i)} title={`Card ${i + 1}`}
                        className="rounded-full transition-all duration-200"
                        style={i === index
                          ? { width: 20, height: 8, background: "#7c3aed", boxShadow: "0 0 8px rgba(124,58,237,0.6)" }
                          : known.has(i)
                          ? { width: 8, height: 8, background: "rgba(16,185,129,0.6)" }
                          : { width: 8, height: 8, background: "rgba(255,255,255,0.08)" }}
                      />
                    ))}
                  </div>

                  {known.size === cards.length && cards.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      className="text-center py-4 rounded-xl"
                      style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
                      <p className="text-base font-bold text-emerald-400">All cards mastered!</p>
                      <p className="text-xs text-gray-500 mt-1">Great session — generate a new deck to keep going.</p>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* Browse view */}
              {card && !loading && view === "browse" && (
                <motion.div key="bv" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="space-y-2">
                  <p className="text-xs text-gray-600 pb-1">Click any card to expand the answer. "Study" jumps to that card.</p>
                  {cards.map((c, i) => (
                    <BrowseCard key={i} card={c} index={i} isKnown={known.has(i)} onJump={jumpTo} />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ── HISTORY TAB ── */}
        {tab === "history" && (
          <motion.div key="history-tab" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
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
                <h3 className="text-base font-semibold text-gray-500 mb-1">No flashcard history yet</h3>
                <p className="text-gray-700 text-sm">Generate a deck and it will be saved here automatically.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between pb-1">
                  <span className="text-xs text-gray-600 font-medium">
                    {history.length} deck{history.length !== 1 ? "s" : ""} saved
                  </span>
                  <button onClick={handleClearHistory}
                    className="flex items-center gap-1.5 text-[11px] text-gray-700 hover:text-red-400 transition-colors">
                    <FiTrash2 size={10} /> Clear All
                  </button>
                </div>
                {history.map((entry, i) => (
                  <HistoryEntry key={entry.id} entry={entry} index={i} onReStudy={handleReStudy} />
                ))}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
