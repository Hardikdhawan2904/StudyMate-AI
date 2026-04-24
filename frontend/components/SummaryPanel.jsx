import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { generateSummary, explainTopic } from "../services/api";
import toast from "react-hot-toast";
import ReactMarkdown from "react-markdown";
import GeneratingLoader from "./GeneratingLoader";
import {
  FiZap, FiBookOpen, FiKey, FiHash,
  FiChevronDown, FiCheckCircle, FiTarget, FiX, FiLoader,
} from "react-icons/fi";

const SUMMARY_STEPS = [
  "Reading your document…",
  "Identifying key topics…",
  "Writing topic explanations…",
  "Extracting key definitions…",
  "Compiling exam tips…",
  "Finalizing study guide…",
];

function SectionHeader({ icon: Icon, label, count, color, accent }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center"
        style={{ background: `${accent}22`, border: `1px solid ${accent}44` }}>
        <Icon size={13} style={{ color: accent }} />
      </div>
      <h3 className="text-sm font-semibold text-gray-200 flex-1">{label}</h3>
      {count != null && (
        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
          style={{ background: `${accent}18`, color: accent, border: `1px solid ${accent}30` }}>
          {count}
        </span>
      )}
    </div>
  );
}

function TopicCard({ topic, index }) {
  const [open, setOpen] = useState(index < 2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="rounded-xl overflow-hidden"
      style={{ border: "1px solid rgba(124,58,237,0.18)", background: "rgba(124,58,237,0.04)" }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-purple-900/10"
      >
        <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] font-bold"
          style={{ background: "rgba(124,58,237,0.2)", color: "#a78bfa" }}>
          {index + 1}
        </div>
        <span className="text-sm font-semibold text-gray-100 flex-1">{topic.title}</span>
        <FiChevronDown
          size={13}
          className="text-gray-500 flex-shrink-0 transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3"
              style={{ borderTop: "1px solid rgba(124,58,237,0.1)" }}>
              {/* Explanation */}
              <p className="text-sm text-gray-300 leading-relaxed pt-3">
                {topic.explanation}
              </p>

              {/* Key points */}
              {topic.key_points?.length > 0 && (
                <ul className="space-y-1.5 pt-1">
                  {topic.key_points.map((pt, i) => (
                    <li key={i} className="flex gap-2.5 text-xs text-gray-400 leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500 flex-shrink-0 mt-1.5"
                        style={{ boxShadow: "0 0 4px rgba(124,58,237,0.5)" }} />
                      {pt}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Topic popup modal ─────────────────────────────────────────────────────────

function TopicPopup({ concept, onClose }) {
  // concept = { name, explanation, key_points, loading }
  return (
    <AnimatePresence>
      {concept && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }}
            onClick={onClose}
          >
            {/* Card — stop propagation so clicking inside doesn't close */}
            <motion.div
              key="card"
              initial={{ opacity: 0, scale: 0.93, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 20 }}
              transition={{ type: "spring", stiffness: 340, damping: 28 }}
              onClick={e => e.stopPropagation()}
              className="relative w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 overflow-y-auto max-h-[85vh] sm:max-h-[80vh]"
              style={{
                background: "linear-gradient(135deg, #0f0a1e 0%, #0a0520 100%)",
                border: "1px solid rgba(124,58,237,0.35)",
                boxShadow: "0 0 60px rgba(124,58,237,0.25), 0 24px 48px rgba(0,0,0,0.6)",
              }}
            >
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#6b7280" }}
                onMouseOver={e => Object.assign(e.currentTarget.style, { background: "rgba(239,68,68,0.12)", borderColor: "rgba(239,68,68,0.3)", color: "#f87171" })}
                onMouseOut={e => Object.assign(e.currentTarget.style, { background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)", color: "#6b7280" })}
              >
                <FiX size={13} />
              </button>

              {/* Topic label */}
              <div className="flex items-center gap-2.5 mb-5 pr-8">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.35)" }}>
                  <FiBookOpen size={14} className="text-purple-400" />
                </div>
                <h3 className="text-base font-bold text-white leading-snug">{concept.name}</h3>
              </div>

              {/* Loading state */}
              {concept.loading && (
                <div className="flex items-center gap-3 py-8 justify-center">
                  <div className="w-5 h-5 border-2 border-purple-500/30 border-t-purple-400 rounded-full animate-spin" />
                  <span className="text-sm text-gray-400">Fetching explanation…</span>
                </div>
              )}

              {/* Explanation */}
              {!concept.loading && concept.explanation && (
                <p className="text-sm text-gray-300 leading-relaxed mb-4">
                  {concept.explanation}
                </p>
              )}

              {/* Key Points */}
              {!concept.loading && concept.key_points?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-2.5">Key Points</p>
                  <ul className="space-y-2">
                    {concept.key_points.map((pt, i) => (
                      <li key={i} className="flex gap-2.5 text-sm text-gray-300 leading-relaxed">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 flex-shrink-0 mt-2"
                          style={{ boxShadow: "0 0 5px rgba(124,58,237,0.6)" }} />
                        {pt}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Fallback markdown (from API explain-topic) */}
              {!concept.loading && concept.markdown && (
                <div className="
                  prose prose-invert prose-sm max-w-none
                  prose-p:my-2 prose-p:leading-relaxed
                  prose-ul:my-2 prose-li:my-1
                  prose-h2:text-sm prose-h2:font-bold prose-h2:text-white prose-h2:mt-4 prose-h2:mb-2
                  prose-h3:text-sm prose-h3:font-semibold prose-h3:text-purple-300 prose-h3:mt-3 prose-h3:mb-1
                  prose-strong:text-gray-100
                ">
                  <ReactMarkdown>{concept.markdown}</ReactMarkdown>
                </div>
              )}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function EmptyState({ onGenerate, hasDoc, loading }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 rounded-3xl bg-purple-900/20 border border-purple-700/20 flex items-center justify-center mb-5"
        style={{ boxShadow: "0 0 30px rgba(124,58,237,0.08)" }}>
        <FiBookOpen className="text-purple-500 text-3xl" />
      </div>
      <h3 className="text-lg font-semibold text-gray-300 mb-2">Exam Study Guide</h3>
      <p className="text-gray-600 text-sm max-w-xs mb-8">
        {!hasDoc
          ? "Upload a document first, then generate a comprehensive exam study guide."
          : "Generate a detailed topic-by-topic breakdown of your entire document — perfect for exam prep."}
      </p>
      {hasDoc && (
        <motion.button
          whileHover={{ scale: 1.03, y: -1 }}
          whileTap={{ scale: 0.97 }}
          onClick={onGenerate}
          disabled={loading}
          className="btn-glow px-6 py-3 flex items-center gap-2"
        >
          <FiZap size={14} />
          Generate Study Guide
        </motion.button>
      )}
    </div>
  );
}

export default function SummaryPanel({ selectedDocId, documents, genJob, onGenerate }) {
  const [summary,   setSummary]   = useState(null);
  const [popup,     setPopup]     = useState(null); // { name, explanation, key_points } | null

  const loading = genJob?.status === "loading";
  const doc     = documents.find((d) => d.doc_id === selectedDocId);

  // Sync result from background job
  useEffect(() => {
    if (genJob?.status === "done" && genJob.result) {
      setSummary(genJob.result);
      toast.success("Study guide generated!");
    }
    if (genJob?.status === "error") {
      toast.error(genJob.error || "Generation failed.");
    }
  }, [genJob?.status]); // eslint-disable-line

  const handleConceptClick = async (conceptName) => {
    // 1. Try to find a matching topic already in summary.topics
    const match = summary?.topics?.find(
      (t) => t.title?.toLowerCase().includes(conceptName.toLowerCase()) ||
             conceptName.toLowerCase().includes(t.title?.toLowerCase())
    );

    if (match) {
      setPopup({ name: conceptName, explanation: match.explanation, key_points: match.key_points });
      return;
    }

    // 2. No local match — call the explain-topic API
    if (!selectedDocId) return;
    setPopup({ name: conceptName, loading: true });
    try {
      const data = await explainTopic(selectedDocId, conceptName, null, 1, 1);
      setPopup({ name: conceptName, markdown: data.answer });
    } catch {
      setPopup({ name: conceptName, explanation: "Could not load explanation. Please try again." });
    }
  };

  const handleGenerate = () => {
    if (!selectedDocId) { toast.error("Select a document first."); return; }
    setSummary(null);
    onGenerate(selectedDocId, () => generateSummary(selectedDocId));
  };

  const hasDoc = documents.length > 0;

  return (
    <div className="space-y-5">

      {/* Topic popup */}
      <TopicPopup concept={popup} onClose={() => setPopup(null)} />

      {/* Toolbar */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg md:text-xl font-bold text-white">Exam Study Guide</h2>
          {doc && <p className="text-xs text-gray-600 mt-0.5 truncate">{doc.name}</p>}
        </div>
        {(hasDoc || summary) && (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleGenerate}
            disabled={loading || !selectedDocId}
            className="btn-glow px-5 py-2.5 text-sm flex items-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Analyzing…
              </>
            ) : (
              <><FiZap size={13} /> {summary ? "Regenerate" : "Generate"}</>
            )}
          </motion.button>
        )}
      </div>

      {/* Loading */}
      <AnimatePresence>
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <GeneratingLoader
              steps={SUMMARY_STEPS}
              intervalMs={3800}
              title="Building your study guide…"
              subtitle="This may take 20–40 seconds for large documents"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!summary && !loading && (
        <EmptyState onGenerate={handleGenerate} hasDoc={hasDoc} loading={loading} />
      )}

      {/* Results */}
      {summary && !loading && (
        <div className="space-y-5">

          {/* Key Concepts chips */}
          {summary.key_concepts?.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="dash-card p-5">
              <SectionHeader icon={FiHash} label="All Topics & Subtopics" count={summary.key_concepts.length} accent="#a78bfa" />
              <p className="text-[11px] text-gray-600 mb-3">Click any topic to see its explanation</p>
              <div className="flex flex-wrap gap-2">
                {summary.key_concepts.map((c, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.04 }}
                    whileHover={{ scale: 1.05, y: -1 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => handleConceptClick(c)}
                    className="badge-purple cursor-pointer transition-all duration-150"
                    style={{ outline: "none" }}
                    onMouseOver={e => Object.assign(e.currentTarget.style, { background: "rgba(124,58,237,0.25)", borderColor: "rgba(167,139,250,0.6)", color: "#c4b5fd" })}
                    onMouseOut={e => Object.assign(e.currentTarget.style, { background: "", borderColor: "", color: "" })}
                  >
                    {c}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Topic-by-topic explanations */}
          {summary.topics?.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }} className="dash-card p-5">
              <SectionHeader icon={FiBookOpen} label="Topic-by-Topic Explanation"
                count={summary.topics.length} accent="#60a5fa" />
              <div className="space-y-2">
                {summary.topics.map((topic, i) => (
                  <TopicCard key={i} topic={topic} index={i} />
                ))}
              </div>
            </motion.div>
          )}

          {/* Definitions */}
          {summary.definitions?.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }} className="dash-card p-5">
              <SectionHeader icon={FiKey} label="Key Definitions"
                count={summary.definitions.length} accent="#f59e0b" />
              <div className="space-y-4">
                {summary.definitions.map((def, i) => (
                  <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="border-l-2 pl-4"
                    style={{ borderColor: "rgba(245,158,11,0.4)" }}>
                    <p className="text-sm font-semibold text-amber-300">{def.term}</p>
                    <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{def.definition}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Exam Tips */}
          {summary.exam_tips?.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }} className="dash-card p-5">
              <SectionHeader icon={FiTarget} label="Exam Preparation Tips"
                count={summary.exam_tips.length} accent="#34d399" />
              <ul className="space-y-2.5">
                {summary.exam_tips.map((tip, i) => (
                  <motion.li key={i} initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                    className="flex gap-3 text-sm text-gray-300 leading-relaxed">
                    <FiCheckCircle size={14} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                    {tip}
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          )}

          {/* Footer info */}
          <p className="text-center text-[11px] text-gray-700 pb-2">
            {summary.strategy === "map-reduce"
              ? `Full document analysis · ${summary.estimated_pages} pages processed`
              : `Direct analysis · ${summary.estimated_pages} estimated pages`}
          </p>
        </div>
      )}
    </div>
  );
}
