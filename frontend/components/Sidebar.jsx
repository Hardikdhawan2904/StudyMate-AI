import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiUploadCloud, FiMessageSquare, FiFileText,
  FiAward, FiLayers, FiBookOpen, FiLogOut,
  FiTrash2, FiChevronDown, FiClock, FiX, FiMessageCircle,
} from "react-icons/fi";
import { deleteDocument, deleteChatSession } from "../services/api";
import toast from "react-hot-toast";
import { useRouter } from "next/router";

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)   return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function ChatItem({ session, selected, onSelect, onDelete }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      onClick={() => onSelect(session)}
      className="group flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200"
      style={{
        border: selected ? "1px solid rgba(96,165,250,0.35)" : "1px solid transparent",
        background: selected ? "rgba(59,130,246,0.1)" : "transparent",
        boxShadow: selected ? "0 0 12px rgba(59,130,246,0.08)" : "none",
      }}
      onMouseEnter={(e) => { if (!selected) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
      onMouseLeave={(e) => { if (!selected) e.currentTarget.style.background = "transparent"; }}
    >
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: selected ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.04)" }}>
        <FiMessageSquare style={{ fontSize: 11, color: selected ? "#60a5fa" : "#6b7280" }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate leading-tight" style={{ color: selected ? "#bfdbfe" : "#9ca3af" }}>
          {session.title}
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: selected ? "#60a5fa99" : "#4b5563" }}>
          {timeAgo(session.created_at)}
        </p>
      </div>
      {/* Always visible on mobile (touch), hover-only on desktop */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(session.id); }}
        className="flex-shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
        style={{ color: "#4b5563", background: "none", border: "none", cursor: "pointer" }}
        onMouseOver={(e) => e.currentTarget.style.color = "#f87171"}
        onMouseOut={(e) => e.currentTarget.style.color = "#4b5563"}
      >
        <FiTrash2 style={{ fontSize: 11 }} />
      </button>
    </motion.div>
  );
}

const navItems = [
  { id: "upload",     icon: FiUploadCloud,   label: "Upload Notes",   desc: "PDF, DOCX, TXT",    color: "#a78bfa" },
  { id: "chat",       icon: FiMessageSquare, label: "Ask AI",         desc: "Chat with notes",   color: "#60a5fa" },
  { id: "summary",    icon: FiFileText,      label: "Summary",        desc: "Key concepts",      color: "#34d399" },
  { id: "quiz",       icon: FiAward,         label: "Quiz Generator", desc: "MCQ practice",      color: "#f59e0b" },
  { id: "flashcards", icon: FiLayers,        label: "Flashcards",     desc: "Flip study cards",  color: "#f472b6" },
];


export default function Sidebar({
  activeSection, setActiveSection,
  documents, setDocuments,
  selectedDocId, setSelectedDocId,
  user,
  sessions, setSessions,
  selectedSessionId, onSelectSession, onNewChat,
  onClose, onFeedback,
}) {
  const router = useRouter();
  const [chatsCollapsed, setChatsCollapsed] = useState(false);

  const handleDelete = async (docId) => {
    try {
      await deleteDocument(docId);
      setDocuments((prev) => prev.filter((d) => d.doc_id !== docId));
      if (selectedDocId === docId) setSelectedDocId(null);
      toast.success("Document removed");
    } catch {
      toast.error("Could not delete document");
    }
  };

  const handleDeleteSession = async (sessionId) => {
    try {
      await deleteChatSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (selectedSessionId === sessionId) onNewChat?.();
      toast.success("Chat deleted");
    } catch {
      toast.error("Could not delete chat");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("studymate_auth");
    router.push("/login");
  };

  return (
    <aside className="sidebar-glass w-60 h-screen flex-shrink-0 flex flex-col">

      {/* Logo */}
      <div className="px-5 pt-6 pb-4 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(124,58,237,0.1)" }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: "linear-gradient(135deg, #7c3aed, #3b82f6)",
            boxShadow: "0 0 18px rgba(124,58,237,0.5), inset 0 1px 0 rgba(255,255,255,0.2)",
          }}>
          <FiBookOpen style={{ color: "white", fontSize: 15 }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white leading-none tracking-tight">StudyMate AI</p>
          <p className="text-[10px] mt-0.5" style={{ color: "#6b7280" }}>AI Study Assistant</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-150"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#6b7280" }}
            onMouseOver={(e) => Object.assign(e.currentTarget.style, { background: "rgba(239,68,68,0.12)", borderColor: "rgba(239,68,68,0.3)", color: "#f87171" })}
            onMouseOut={(e) => Object.assign(e.currentTarget.style, { background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)", color: "#6b7280" })}
          >
            <FiX style={{ fontSize: 13 }} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {navItems.map(({ id, icon: Icon, label, desc, color }) => {
          const isActive = activeSection === id;
          return (
            <motion.button
              key={id}
              whileHover={!isActive ? { x: 2 } : {}}
              whileTap={{ scale: 0.97 }}
              onClick={() => { setActiveSection(id); onClose?.(); }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all duration-200"
              style={{
                background: isActive
                  ? `linear-gradient(135deg, ${color}12, ${color}06)`
                  : "transparent",
                border: isActive
                  ? `1px solid ${color}30`
                  : "1px solid transparent",
                boxShadow: isActive ? `0 0 16px ${color}12, inset 0 1px 0 ${color}18` : "none",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = `${color}08`;
                  e.currentTarget.style.borderColor = `${color}18`;
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.borderColor = "transparent";
                }
              }}
            >
              {/* Icon */}
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200"
                style={{
                  background: isActive ? `${color}22` : "rgba(255,255,255,0.04)",
                  border: isActive ? `1px solid ${color}44` : "1px solid rgba(255,255,255,0.04)",
                  boxShadow: isActive ? `0 0 12px ${color}33` : "none",
                }}>
                <Icon style={{ fontSize: 14, color: isActive ? color : "#6b7280" }} />
              </div>

              {/* Text */}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold leading-none" style={{ color: isActive ? "#fff" : "#9ca3af" }}>
                  {label}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: isActive ? `${color}cc` : "#374151" }}>
                  {desc}
                </p>
              </div>

              {/* Active indicator bar */}
              {isActive && (
                <motion.div
                  layoutId="nav-pill"
                  className="w-1 h-5 rounded-full flex-shrink-0"
                  style={{ background: `linear-gradient(to bottom, ${color}, ${color}88)`, boxShadow: `0 0 10px ${color}` }}
                />
              )}
            </motion.button>
          );
        })}

        {/* Chat history section */}
        {sessions?.length > 0 && (
          <div className="pt-4">
            <button
              onClick={() => setChatsCollapsed(!chatsCollapsed)}
              className="flex items-center justify-between w-full px-3 py-1.5 mb-1 transition-opacity hover:opacity-80"
            >
              <span className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5" style={{ color: "#4b5563" }}>
                <FiClock style={{ fontSize: 9 }} /> Recent Chats ({sessions.length})
              </span>
              <FiChevronDown style={{
                color: "#4b5563", fontSize: 11,
                transform: chatsCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
                transition: "transform 0.2s",
              }} />
            </button>
            <AnimatePresence>
              {!chatsCollapsed && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-0.5 overflow-hidden"
                >
                  {sessions.map((s) => (
                    <ChatItem
                      key={s.id}
                      session={s}
                      selected={selectedSessionId === s.id}
                      onSelect={(session) => { onSelectSession(session); onClose?.(); }}
                      onDelete={handleDeleteSession}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

      </nav>

      {/* User + Logout */}
      <div className="px-3 py-4" style={{ borderTop: "1px solid rgba(124,58,237,0.08)" }}>
        {user && (
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl mb-2"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.05)",
            }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #3b82f6)",
                boxShadow: "0 0 10px rgba(124,58,237,0.3)",
              }}>
              {user.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-gray-200 truncate">{user.name}</p>
              <p className="text-[10px] truncate" style={{ color: "#4b5563" }}>{user.email}</p>
            </div>
          </div>
        )}

        {/* Feedback */}
        <motion.button
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => { onFeedback?.(); onClose?.(); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 mb-1"
          style={{ color: "#6b7280", border: "1px solid transparent" }}
          onMouseOver={(e) => {
            e.currentTarget.style.color = "#a78bfa";
            e.currentTarget.style.background = "rgba(124,58,237,0.08)";
            e.currentTarget.style.borderColor = "rgba(124,58,237,0.2)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.color = "#6b7280";
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.borderColor = "transparent";
          }}
        >
          <FiMessageCircle style={{ fontSize: 13 }} />
          <span className="text-xs font-medium">Feedback &amp; Help</span>
        </motion.button>

        {/* Sign Out */}
        <motion.button
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200"
          style={{ color: "#6b7280", border: "1px solid transparent" }}
          onMouseOver={(e) => {
            e.currentTarget.style.color = "#f87171";
            e.currentTarget.style.background = "rgba(239,68,68,0.06)";
            e.currentTarget.style.borderColor = "rgba(239,68,68,0.15)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.color = "#6b7280";
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.borderColor = "transparent";
          }}
        >
          <FiLogOut style={{ fontSize: 13 }} />
          <span className="text-xs font-medium">Sign Out</span>
        </motion.button>
      </div>
    </aside>
  );
}
