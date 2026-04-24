import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { askQuestion, createChatSession, addChatMessage, getChatSession, getDocumentTopics, explainTopic } from "../services/api";
import toast from "react-hot-toast";
import ReactMarkdown from "react-markdown";
import {
  FiSend, FiUser, FiCpu, FiFileText, FiPlus,
  FiCopy, FiRefreshCw, FiThumbsUp, FiCheck, FiAlertTriangle,
} from "react-icons/fi";

// ── Constants ─────────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  "Explain this topic in simple terms",
  "What are the most important concepts?",
  "Help me understand this for my exam",
  "What should I focus on to score well?",
  "Define the key terms in this document",
];

const DEFAULT_CHIPS = [
  { label: "Explain simply",  query: "Explain this topic in simple terms" },
  { label: "Key concepts",    query: "What are the most important concepts I need to know?" },
  { label: "Exam focus",      query: "What should I focus on to score well in the exam?" },
  { label: "Define terms",    query: "Define the key terms from this document" },
];

// Full pool of contextual follow-up chips
const CHIP_POOL = [
  { label: "Explain simply",      query: "Can you explain that in even simpler terms?" },
  { label: "Give an example",     query: "Can you give a concrete example of this?" },
  { label: "Why important?",      query: "Why is this concept important to understand?" },
  { label: "Real-world use",      query: "What is a real-world application of this?" },
  { label: "Exam tips",           query: "What exam questions are likely from this topic?" },
  { label: "Key points",          query: "What are the key points to remember for the exam?" },
  { label: "Common mistakes",     query: "What mistakes do students commonly make on this?" },
  { label: "Quick summary",       query: "Give me a quick bullet-point summary of this." },
  { label: "Compare concepts",    query: "How does this compare to related concepts?" },
  { label: "Go deeper",           query: "Can you go deeper into the most complex part?" },
  { label: "Step by step",        query: "Can you break this down step by step?" },
  { label: "Any formula?",        query: "Is there a formula or rule I need to memorize?" },
  { label: "What comes next?",    query: "What topic should I study after this?" },
  { label: "Test me",             query: "Ask me a question to test if I understood this." },
  { label: "Related topics",      query: "What other topics are related to what we just covered?" },
  { label: "Summarize chat",      query: "Summarize everything we have discussed so far." },
  { label: "Key concepts",        query: "What are the most important concepts I need to know?" },
  { label: "Exam focus",          query: "What should I focus on to score well in the exam?" },
  { label: "Define terms",        query: "Define the key terms from this document." },
  { label: "More detail",         query: "Can you elaborate on that with more detail?" },
  { label: "Pros and cons",       query: "What are the pros and cons of this?" },
  { label: "How to remember?",    query: "What is a good way to memorize or remember this?" },
  { label: "Simplify further",    query: "Can you simplify the explanation even further?" },
  { label: "What's the catch?",   query: "Are there any exceptions or edge cases I should know?" },
];

// Keyword patterns → preferred chip labels (ordered by relevance)
const KEYWORD_MAP = [
  { re: /formula|equation|theorem|proof|calculat|mathemat/i, prefer: ["Any formula?", "Step by step", "Give an example", "Go deeper"] },
  { re: /example|instance|case|scenario|illustrat/i,         prefer: ["Real-world use", "Compare concepts", "Go deeper", "Give an example"] },
  { re: /important|key|critical|essential|crucial|fundament/i, prefer: ["Key points", "Exam tips", "Exam focus", "Common mistakes"] },
  { re: /difficult|complex|hard|confus|unclear|tricky/i,     prefer: ["Explain simply", "Step by step", "Give an example", "Simplify further"] },
  { re: /compar|differ|similar|versus|\bvs\b|contrast/i,     prefer: ["Compare concepts", "Related topics", "Go deeper", "Pros and cons"] },
  { re: /summar|overview|brief|outline|recap/i,              prefer: ["Go deeper", "Key points", "Test me", "What comes next?"] },
  { re: /next|continu|proceed|after|follow|then/i,           prefer: ["What comes next?", "Related topics", "Test me", "Summarize chat"] },
  { re: /defin|meaning|term|concept|what is|what are/i,      prefer: ["Give an example", "Real-world use", "Go deeper", "How to remember?"] },
  { re: /exam|test|quiz|score|mark|grade|study/i,            prefer: ["Exam tips", "Key points", "Common mistakes", "Test me", "Exam focus"] },
  { re: /step|process|procedure|how to|method|approach/i,    prefer: ["Step by step", "Give an example", "Any formula?", "Why important?"] },
  { re: /remember|memoriz|recall|forget|trick/i,             prefer: ["How to remember?", "Quick summary", "Test me", "Key points"] },
  { re: /except|limit|edge case|however|but|although/i,      prefer: ["What's the catch?", "Compare concepts", "Go deeper", "Common mistakes"] },
  { re: /application|use|practical|industry|real/i,          prefer: ["Real-world use", "Why important?", "Give an example", "Related topics"] },
];

function pickDynamicChips(lastAIContent, lastUserQuery, recentLabels) {
  const text = `${lastAIContent} ${lastUserQuery}`;
  const scores = new Map(CHIP_POOL.map((c, i) => [i, 0]));

  for (const { re, prefer } of KEYWORD_MAP) {
    if (re.test(text)) {
      prefer.forEach((label, rank) => {
        const idx = CHIP_POOL.findIndex(c => c.label === label);
        if (idx !== -1) scores.set(idx, (scores.get(idx) || 0) + (prefer.length - rank));
      });
    }
  }

  // Penalize recently shown chips to encourage variety
  CHIP_POOL.forEach((chip, i) => {
    if (recentLabels.has(chip.label)) scores.set(i, (scores.get(i) || 0) - 10);
  });

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([i]) => CHIP_POOL[i]);
}

const WELCOME = {
  role: "assistant",
  content:
    "Hello, I am **StudyMate AI**.\n\nUpload your study notes and I will help you understand them better.\n\n**What I can help with:**\n- Explain concepts from your notes in clear, simple terms\n- Answer questions based on your uploaded material\n- Summarize topics and highlight what matters most\n- Help you prepare effectively for exams\n\nUpload a file and start asking.",
  sources: [],
};


// ── Message Actions ───────────────────────────────────────────────────────────

function MessageActions({ content, onRegenerate, isLastAI }) {
  const [copied, setCopied]   = useState(false);
  const [helpful, setHelpful] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const btn = (active, activeColor, activeBg, activeBorder) => ({
    color:       active ? activeColor : "#4b5563",
    background:  active ? activeBg   : "rgba(255,255,255,0.02)",
    border:      `1px solid ${active ? activeBorder : "rgba(255,255,255,0.05)"}`,
  });

  return (
    <div className="flex items-center gap-1 mt-2">
      <button
        onClick={handleCopy}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-150"
        style={btn(copied, "#34d399", "rgba(52,211,153,0.08)", "rgba(52,211,153,0.25)")}
      >
        {copied ? <FiCheck size={10} /> : <FiCopy size={10} />}
        {copied ? "Copied" : "Copy"}
      </button>

      {isLastAI && onRegenerate && (
        <button
          onClick={onRegenerate}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-150"
          style={btn(false, "#a78bfa", "rgba(124,58,237,0.1)", "rgba(124,58,237,0.3)")}
          onMouseOver={e => Object.assign(e.currentTarget.style, { color: "#a78bfa", background: "rgba(124,58,237,0.1)", borderColor: "rgba(124,58,237,0.3)" })}
          onMouseOut={e => Object.assign(e.currentTarget.style, { color: "#4b5563", background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.05)" })}
        >
          <FiRefreshCw size={10} /> Regenerate
        </button>
      )}

      <button
        onClick={() => setHelpful(!helpful)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-150"
        style={btn(helpful, "#60a5fa", "rgba(59,130,246,0.1)", "rgba(59,130,246,0.28)")}
      >
        <FiThumbsUp size={10} />
        {helpful ? "Helpful" : "Mark helpful"}
      </button>
    </div>
  );
}

// ── Message Bubble ────────────────────────────────────────────────────────────

function Message({ role, content, sources, isLastAI, onRegenerate }) {
  const isUser = role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
        style={
          isUser
            ? { background: "linear-gradient(135deg,#7c3aed,#3b82f6)", boxShadow: "0 0 10px rgba(124,58,237,0.3)" }
            : { background: "linear-gradient(135deg,rgba(124,58,237,0.18),rgba(59,130,246,0.1))", border: "1px solid rgba(124,58,237,0.3)", boxShadow: "0 0 12px rgba(124,58,237,0.12)" }
        }
      >
        {isUser
          ? <FiUser size={13} className="text-white" />
          : <FiCpu  size={13} className="text-purple-400" />}
      </div>

      {/* Content */}
      <div className={`max-w-[82%] flex flex-col ${isUser ? "items-end" : "items-start"}`}>
        <div className={isUser ? "bubble-user" : "bubble-ai"}>
          {isUser ? (
            <p className="text-sm leading-relaxed">{content}</p>
          ) : (
            <div className="
              prose prose-invert prose-sm max-w-none
              prose-p:my-2 prose-p:leading-[1.75]
              prose-ul:my-2 prose-li:my-1 prose-li:leading-relaxed
              prose-ol:my-2
              prose-h1:text-[15px] prose-h1:font-bold prose-h1:text-white prose-h1:mt-5 prose-h1:mb-2 prose-h1:border-b prose-h1:border-purple-900/30 prose-h1:pb-1
              prose-h2:text-sm prose-h2:font-bold prose-h2:text-gray-100 prose-h2:mt-4 prose-h2:mb-2
              prose-h3:text-sm prose-h3:font-semibold prose-h3:text-purple-300 prose-h3:mt-3 prose-h3:mb-1
              prose-strong:text-gray-100 prose-strong:font-semibold
              prose-em:text-gray-300
              prose-code:text-purple-300 prose-code:bg-purple-950/60 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-[12px] prose-code:font-mono
              prose-pre:bg-[#0a0520] prose-pre:border prose-pre:border-purple-900/30 prose-pre:rounded-xl prose-pre:p-4
              prose-blockquote:border-l-2 prose-blockquote:border-purple-500/50 prose-blockquote:text-gray-400 prose-blockquote:pl-4 prose-blockquote:italic
              prose-hr:border-purple-900/25 prose-hr:my-4
            ">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          )}
        </div>

        {!isUser && (
          <div className="w-full mt-1 px-1">
            <MessageActions content={content} onRegenerate={isLastAI ? onRegenerate : undefined} isLastAI={isLastAI} />
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Typing Indicator ──────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: "linear-gradient(135deg,rgba(124,58,237,0.18),rgba(59,130,246,0.1))", border: "1px solid rgba(124,58,237,0.3)" }}>
        <FiCpu size={13} className="text-purple-400" />
      </div>
      <div className="bubble-ai flex items-center gap-3 px-5 py-3.5">
        <div className="flex gap-1.5">
          {[0, 0.18, 0.36].map((d, i) => (
            <span key={i} className="typing-dot" style={{ animationDelay: `${d}s` }} />
          ))}
        </div>
        <span className="text-[11px]" style={{ color: "#4b5563" }}>Thinking…</span>
      </div>
    </motion.div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ChatInterface({
  selectedDocId, documents, userId,
  sessionId, onSessionCreated, onNewChat,
}) {
  const [messages,          setMessages]          = useState([WELCOME]);
  const [input,             setInput]             = useState("");
  const [loading,           setLoading]           = useState(false);
  const [currentSessionId,  setCurrentSessionId]  = useState(null);
  const [sessionDocId,      setSessionDocId]      = useState(null);
  const [docTopics,         setDocTopics]         = useState([]);
  const [walkthrough,       setWalkthrough]       = useState([]);
  const [topicIdx,          setTopicIdx]          = useState(-1);
  const [dynamicChips,      setDynamicChips]      = useState(DEFAULT_CHIPS);
  const endRef          = useRef(null);
  const inputRef        = useRef(null);
  const topicsShown     = useRef(new Set());
  const recentChipLabels = useRef(new Set(DEFAULT_CHIPS.map(c => c.label)));

  // True when the session references a doc that isn't available on this device
  const sessionDocMissing = sessionDocId && !documents.some((d) => d.doc_id === sessionDocId);

  useEffect(() => {
    if (!sessionId) {
      setMessages([WELCOME]);
      setCurrentSessionId(null);
      setSessionDocId(null);
      setDynamicChips(DEFAULT_CHIPS);
      recentChipLabels.current = new Set(DEFAULT_CHIPS.map(c => c.label));
      return;
    }
    if (sessionId === currentSessionId) return;
    getChatSession(sessionId, userId)
      .then((data) => {
        setMessages(data.messages.length > 0 ? data.messages : [WELCOME]);
        setCurrentSessionId(sessionId);
        setSessionDocId(data.doc_id || null);
      })
      .catch(() => toast.error("Could not load chat history."));
  }, [sessionId]); // eslint-disable-line

  // Auto-generate topic overview when a new document is selected on a fresh chat
  useEffect(() => {
    if (!selectedDocId) return;
    if (sessionId) return;
    if (topicsShown.current.has(selectedDocId)) return;
    topicsShown.current.add(selectedDocId);

    setTopicIdx(-1);
    setDocTopics([]);
    setWalkthrough([]);
    setDynamicChips(DEFAULT_CHIPS);
    recentChipLabels.current = new Set(DEFAULT_CHIPS.map(c => c.label));
    setLoading(true);
    getDocumentTopics(selectedDocId)
      .then((data) => {
        const topics = data.topics || [];
        setDocTopics(topics);

        // Build flat walkthrough: topic → its subtopics → next topic → ...
        const flat = [];
        for (const t of topics) {
          flat.push({ title: t.title, parentTopic: null });          // topic item
          for (const sub of (t.subtopics || [])) {
            flat.push({ title: sub, parentTopic: t.title });         // subtopic item
          }
        }
        setWalkthrough(flat);

        setMessages([WELCOME, { role: "assistant", content: data.content, sources: [] }]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedDocId]); // eslint-disable-line

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendToAI = useCallback(async (q, sid) => {
    setLoading(true);
    // If session's original doc isn't available, search all docs instead
    const docIdToUse = sessionDocMissing ? null : (selectedDocId || null);
    try {
      const data    = await askQuestion(q, docIdToUse);
      const answer  = data.answer;
      const sources = data.sources || [];
      setMessages(p => [...p, { role: "assistant", content: answer, sources }]);
      if (sid) await addChatMessage(sid, "assistant", answer, sources);

      // Refresh suggestion chips based on this exchange
      const newChips = pickDynamicChips(answer, q, recentChipLabels.current);
      setDynamicChips(newChips);
      recentChipLabels.current = new Set(newChips.map(c => c.label));
    } catch (err) {
      const raw = err?.response?.data?.detail || "";
      const isRL = ["rate_limit", "429", "rate-limited", "All models"].some(x => raw.includes(x));
      const msg  = isRL
        ? "All AI models have hit their daily free-tier limits. Please try again in a few hours."
        : raw || "Request failed. Please try again.";
      setMessages(p => [...p, { role: "assistant", content: `**Error:** ${msg}`, sources: [] }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [selectedDocId, sessionDocMissing]); // eslint-disable-line

  // Explain one item from the flat walkthrough (topic or subtopic)
  const explainTopicAt = useCallback(async (idx) => {
    if (!selectedDocId || !walkthrough.length) return;
    const item = walkthrough[idx];
    if (!item) return;

    setLoading(true);
    try {
      const data = await explainTopic(
        selectedDocId,
        item.title,
        item.parentTopic,   // null for topics, parent name for subtopics
        idx + 1,
        walkthrough.length
      );

      const isLast  = idx === walkthrough.length - 1;
      const nextItem = walkthrough[idx + 1];
      const nextLabel = nextItem
        ? nextItem.parentTopic
          ? `${nextItem.parentTopic} › **${nextItem.title}**`
          : `**${nextItem.title}**`
        : "";

      const suffix = isLast
        ? "\n\n---\n\n✅ **You have covered every topic and subtopic in this document!**\n\nFeel free to ask me any question to go deeper on any concept, or test yourself with the Quiz tab."
        : `\n\n---\n📌 **${idx + 1} / ${walkthrough.length} done.** Type **next** to continue with ${nextLabel}`;

      setMessages(p => [...p, { role: "assistant", content: data.answer + suffix, sources: [] }]);
      setTopicIdx(idx);
    } catch {
      setMessages(p => [...p, { role: "assistant", content: "Could not load explanation. Please try again.", sources: [] }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [selectedDocId, walkthrough]);

  const send = useCallback(async (question) => {
    const q = (question || input).trim();
    if (!q || loading) return;
    if (!documents.length) { toast.error("Upload a document first."); return; }

    setMessages(p => [...p, { role: "user", content: q, sources: [] }]);
    setInput("");

    const normalized = q.toLowerCase().trim();

    // match "explain", "explain all", "start", "begin", "start explaining" etc.
    const isExplainCmd = walkthrough.length > 0 && (
      normalized === "explain" ||
      normalized === "start" ||
      normalized === "begin" ||
      normalized.startsWith("explain all") ||
      normalized.startsWith("start explain") ||
      normalized.startsWith("begin explain")
    );

    // match "next", "next topic", "next one", "continue", "go on", "proceed" etc.
    const isNextCmd = walkthrough.length > 0 && topicIdx >= 0 && (
      normalized === "next" ||
      normalized === "continue" ||
      normalized === "go on" ||
      normalized === "proceed" ||
      normalized === "ok next" ||
      normalized === "okay next" ||
      normalized.startsWith("next topic") ||
      normalized.startsWith("next one") ||
      normalized.startsWith("next subtopic") ||
      normalized.startsWith("show next") ||
      normalized.startsWith("move to next") ||
      normalized.startsWith("go to next")
    );

    // ── Start walkthrough ────────────────────────────────────────────────────
    if (isExplainCmd) {
      await explainTopicAt(0);
      return;
    }

    // ── Advance walkthrough ──────────────────────────────────────────────────
    if (isNextCmd) {
      const nextIdx = topicIdx + 1;
      if (nextIdx < walkthrough.length) {
        await explainTopicAt(nextIdx);
      } else {
        setMessages(p => [...p, {
          role: "assistant",
          content: "✅ You have covered all topics and subtopics! Ask me anything to go deeper on any concept.",
          sources: [],
        }]);
      }
      return;
    }

    // ── "explain this" / "explain more" / "tell me more" ────────────────────
    // When the user refers to "this" after a walkthrough step, inject the
    // current topic name so the AI knows exactly what "this" means.
    const isAboutCurrentTopic = topicIdx >= 0 && walkthrough[topicIdx] && (
      normalized.startsWith("explain this") ||
      normalized.startsWith("explain it") ||
      normalized.startsWith("explain more") ||
      normalized.startsWith("more about this") ||
      normalized.startsWith("tell me more") ||
      normalized.startsWith("more detail") ||
      normalized.startsWith("elaborate") ||
      normalized === "more" ||
      normalized === "elaborate this" ||
      normalized === "go deeper" ||
      normalized === "in detail"
    );

    // ── Normal AI question ───────────────────────────────────────────────────
    // If user referred to "this" / "explain more" etc., inject current topic so AI knows what "this" is
    const currentItem = topicIdx >= 0 ? walkthrough[topicIdx] : null;
    const enrichedQ = isAboutCurrentTopic && currentItem
      ? `Regarding the topic "${currentItem.parentTopic ? `${currentItem.parentTopic} → ${currentItem.title}` : currentItem.title}": ${q}`
      : q;

    let sid = currentSessionId;
    if (!sid) {
      const title = q.length > 60 ? q.slice(0, 57) + "…" : q;
      try {
        const created = await createChatSession(userId, selectedDocId || null, title);
        sid = created.session_id;
        setCurrentSessionId(sid);
        onSessionCreated?.({ id: sid, title, doc_id: selectedDocId || null });
      } catch {}
    }
    if (sid) await addChatMessage(sid, "user", q, []);
    await sendToAI(enrichedQ, sid);
  }, [input, loading, documents, currentSessionId, userId, selectedDocId, sendToAI, onSessionCreated, docTopics, walkthrough, topicIdx, explainTopicAt]);

  const regenerate = useCallback(async () => {
    if (loading) return;
    const lastUser = [...messages].reverse().find(m => m.role === "user");
    if (!lastUser) return;
    setMessages(prev => {
      const idx = prev.reduceRight((f, m, i) => f === -1 && m.role === "assistant" ? i : f, -1);
      return idx === -1 ? prev : prev.slice(0, idx);
    });
    await sendToAI(lastUser.content, currentSessionId);
  }, [loading, messages, sendToAI, currentSessionId]);

  const hasDoc    = documents.length > 0;
  const scopeDoc  = selectedDocId ? documents.find(d => d.doc_id === selectedDocId) : null;
  const lastAIIdx = messages.reduceRight((f, m, i) => f === -1 && m.role === "assistant" ? i : f, -1);

  return (
    <div className="flex flex-col h-full">

      {/* ── Missing document warning ─────────────────────────────────────── */}
      {sessionDocMissing && (
        <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl mb-3 flex-shrink-0"
          style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }}>
          <FiAlertTriangle size={13} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-300 leading-relaxed">
            The original document for this chat isn&apos;t available on this device.
            Answering from all your uploaded notes instead.
          </p>
        </div>
      )}

      {/* ── Document context bar ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-5 flex-shrink-0">
        <div
          className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl flex-1 min-w-0"
          style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.18)" }}
        >
          <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(124,58,237,0.15)" }}>
            <FiFileText size={11} className="text-purple-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] uppercase tracking-widest font-bold leading-none mb-0.5" style={{ color: "#4b5563" }}>
              Active Document
            </p>
            <p className="text-[12px] font-medium truncate leading-tight"
              style={{ color: scopeDoc ? "#ddd6fe" : hasDoc ? "#6b7280" : "#374151" }}>
              {scopeDoc ? scopeDoc.name : hasDoc ? "Select a document from the sidebar" : "No document uploaded yet"}
            </p>
          </div>
        </div>

        {currentSessionId && (
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => { onNewChat?.(); setMessages([WELCOME]); setCurrentSessionId(null); setInput(""); }}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all duration-150 flex-shrink-0"
            style={{ color: "#a78bfa", border: "1px solid rgba(124,58,237,0.28)", background: "rgba(124,58,237,0.06)" }}
            onMouseOver={e => Object.assign(e.currentTarget.style, { background: "rgba(124,58,237,0.12)", borderColor: "rgba(124,58,237,0.5)" })}
            onMouseOut={e => Object.assign(e.currentTarget.style, { background: "rgba(124,58,237,0.06)", borderColor: "rgba(124,58,237,0.28)" })}
          >
            <FiPlus size={12} /> New Chat
          </motion.button>
        )}
      </div>

      {/* ── Message list ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto space-y-6 pr-2 min-h-0">
        {messages.map((m, i) => (
          <Message
            key={i}
            {...m}
            isLastAI={i === lastAIIdx}
            onRegenerate={regenerate}
          />
        ))}
        {loading && <TypingIndicator />}
        <div ref={endRef} />
      </div>

      {/* ── Initial quick action chips ────────────────────────────────────── */}
      {messages.length === 1 && !loading && hasDoc && (
        <div className="py-3 flex flex-wrap gap-2 overflow-x-auto pb-2 flex-shrink-0">
          {QUICK_ACTIONS.map((s) => (
            <motion.button
              key={s}
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => send(s)}
              className="text-xs px-3.5 py-2 rounded-xl font-medium transition-all duration-150"
              style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.2)", color: "#9ca3af" }}
              onMouseOver={e => Object.assign(e.currentTarget.style, { color: "#c4b5fd", background: "rgba(124,58,237,0.12)", borderColor: "rgba(124,58,237,0.4)" })}
              onMouseOut={e => Object.assign(e.currentTarget.style, { color: "#9ca3af", background: "rgba(124,58,237,0.06)", borderColor: "rgba(124,58,237,0.2)" })}
            >
              {s}
            </motion.button>
          ))}
        </div>
      )}

      {/* ── Input area ───────────────────────────────────────────────────── */}
      <div className="mt-4 flex-shrink-0 space-y-2">

        {/* Dynamic suggestion chips — update after every AI response */}
        {messages.length > 1 && hasDoc && !loading && (
          <div className="flex flex-wrap gap-1.5 overflow-hidden">
            <AnimatePresence mode="popLayout">
              {dynamicChips.map(({ label, query }) => (
                <motion.button
                  key={label}
                  layout
                  initial={{ opacity: 0, scale: 0.85, y: 4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.85, y: -4 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  onClick={() => send(query)}
                  className="text-[11px] px-3 py-1.5 rounded-lg font-medium transition-colors duration-150"
                  style={{ background: "rgba(124,58,237,0.05)", border: "1px solid rgba(124,58,237,0.16)", color: "#6b7280" }}
                  onMouseOver={e => Object.assign(e.currentTarget.style, { color: "#a78bfa", borderColor: "rgba(124,58,237,0.38)", background: "rgba(124,58,237,0.1)" })}
                  onMouseOut={e => Object.assign(e.currentTarget.style, { color: "#6b7280", borderColor: "rgba(124,58,237,0.16)", background: "rgba(124,58,237,0.05)" })}
                >
                  {label}
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        )}

        <div
          className={`flex items-end gap-2 p-3 rounded-2xl border transition-all duration-300 ${
            loading || !hasDoc
              ? "border-white/5 bg-dark-900/40"
              : "border-purple-800/30 bg-dark-900/60 focus-within:border-purple-600/50"
          }`}
          style={{ boxShadow: loading ? "none" : "0 0 18px rgba(124,58,237,0.06)" }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={
              !hasDoc          ? "Upload a document to start chatting…"
              : selectedDocId  ? "Ask about your notes… (Enter to send)"
                               : "Ask anything across all documents…"
            }
            disabled={loading || !hasDoc}
            rows={1}
            className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-700 resize-none focus:outline-none leading-relaxed py-1 min-h-[24px] max-h-36"
            style={{ fieldSizing: "content" }}
          />
          <motion.button
            whileHover={{ scale: loading || !input.trim() || !hasDoc ? 1 : 1.07 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => send()}
            disabled={loading || !input.trim() || !hasDoc}
            className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 disabled:opacity-25"
            style={{
              background: input.trim() && !loading && hasDoc
                ? "linear-gradient(135deg, #7c3aed, #3b82f6)"
                : "rgba(124,58,237,0.12)",
              boxShadow: input.trim() && !loading && hasDoc ? "0 0 16px rgba(124,58,237,0.4)" : "none",
            }}
          >
            <FiSend size={13} className="text-white" />
          </motion.button>
        </div>

        <p className="text-[10px] px-1" style={{ color: "#374151" }}>
          Shift+Enter for new line · Answers grounded in your notes only
        </p>
      </div>
    </div>
  );
}
