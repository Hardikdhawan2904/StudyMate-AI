import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { sendFeedback } from "../services/api";
import toast from "react-hot-toast";
import {
  FiX, FiSend, FiMessageCircle,
  FiAlertCircle, FiStar, FiHelpCircle, FiMoreHorizontal,
} from "react-icons/fi";

const TYPES = [
  { id: "suggestion", icon: FiStar,        label: "Suggestion",  color: "#f59e0b" },
  { id: "bug",        icon: FiAlertCircle, label: "Bug Report",  color: "#f87171" },
  { id: "question",   icon: FiHelpCircle,  label: "Question",    color: "#60a5fa" },
  { id: "other",      icon: FiMoreHorizontal, label: "Other",    color: "#a78bfa" },
];

export default function FeedbackModal({ onClose, user }) {
  const [name,    setName]    = useState(user?.name || "");
  const [email,   setEmail]   = useState(user?.email || "");
  const [type,    setType]    = useState("suggestion");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent,    setSent]    = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) { toast.error("Please enter a message."); return; }
    setSending(true);
    try {
      const res = await sendFeedback(name, email, type, message);
      if (res.ok) {
        setSent(true);
      } else {
        toast.error("Could not send feedback. Please try again.");
      }
    } catch {
      toast.error("Could not send feedback. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const inputStyle = {
    background:  "rgba(255,255,255,0.03)",
    border:      "1px solid rgba(255,255,255,0.08)",
    color:       "#e5e7eb",
    borderRadius: 12,
    outline:     "none",
    width:       "100%",
    fontSize:    13,
    padding:     "10px 14px",
    transition:  "border-color 0.15s",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(3,0,20,0.8)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.97 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl flex flex-col"
        style={{
          background:  "linear-gradient(145deg, #0e0b1f 0%, #080517 100%)",
          border:      "1px solid rgba(124,58,237,0.25)",
          boxShadow:   "0 0 80px rgba(124,58,237,0.12), 0 24px 60px rgba(0,0,0,0.7)",
          maxHeight:   "92vh",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(124,58,237,0.12)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#7c3aed,#3b82f6)", boxShadow: "0 0 18px rgba(124,58,237,0.4)" }}>
              <FiMessageCircle className="text-white" size={15} />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Feedback & Help</p>
              <p className="text-[10px]" style={{ color: "#6b7280" }}>Your message goes directly to the developer</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#6b7280" }}
            onMouseOver={(e) => Object.assign(e.currentTarget.style, { background: "rgba(239,68,68,0.12)", borderColor: "rgba(239,68,68,0.3)", color: "#f87171" })}
            onMouseOut={(e) => Object.assign(e.currentTarget.style, { background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)", color: "#6b7280" })}
          >
            <FiX size={13} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <AnimatePresence mode="wait">
            {sent ? (
              <motion.div key="sent"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-12 text-center"
              >
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.3)", boxShadow: "0 0 30px rgba(52,211,153,0.12)" }}>
                  <span className="text-3xl">🎉</span>
                </div>
                <h3 className="text-base font-bold text-white mb-1">Thank you!</h3>
                <p className="text-sm text-gray-500 max-w-xs">
                  Your message has been sent. I&apos;ll get back to you soon.
                </p>
                <motion.button
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={onClose}
                  className="mt-6 px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{ background: "linear-gradient(135deg,#7c3aed,#3b82f6)", boxShadow: "0 0 20px rgba(124,58,237,0.3)" }}
                >
                  Close
                </motion.button>
              </motion.div>
            ) : (
              <motion.form key="form" onSubmit={handleSubmit} className="space-y-4">

                {/* Type selector */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "#6b7280" }}>Type</p>
                  <div className="grid grid-cols-4 gap-1 sm:gap-1.5">
                    {TYPES.map(({ id, icon: Icon, label, color }) => (
                      <button key={id} type="button" onClick={() => setType(id)}
                        className="flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-xl transition-all duration-150"
                        style={type === id ? {
                          background: `${color}18`,
                          border:     `1px solid ${color}40`,
                          boxShadow:  `0 0 12px ${color}15`,
                        } : {
                          background: "rgba(255,255,255,0.02)",
                          border:     "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        <Icon size={14} style={{ color: type === id ? color : "#6b7280" }} />
                        <span className="text-[10px] font-semibold leading-none"
                          style={{ color: type === id ? color : "#6b7280" }}>
                          {label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Name */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#6b7280" }}>Your Name</p>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    style={inputStyle}
                    onFocus={(e) => e.target.style.borderColor = "rgba(124,58,237,0.5)"}
                    onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
                  />
                </div>

                {/* Email */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#6b7280" }}>
                    Email <span style={{ color: "#374151", textTransform: "none", fontSize: 10, fontWeight: 400 }}>(optional — for reply)</span>
                  </p>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    style={inputStyle}
                    onFocus={(e) => e.target.style.borderColor = "rgba(124,58,237,0.5)"}
                    onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
                  />
                </div>

                {/* Message */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#6b7280" }}>Message</p>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={
                      type === "bug"        ? "Describe what happened and how to reproduce it…" :
                      type === "suggestion" ? "What feature or improvement would you like to see?" :
                      type === "question"   ? "What would you like to know?" :
                      "Type your message here…"
                    }
                    rows={4}
                    required
                    style={{ ...inputStyle, resize: "vertical", minHeight: 96, fontFamily: "inherit" }}
                    onFocus={(e) => e.target.style.borderColor = "rgba(124,58,237,0.5)"}
                    onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
                  />
                </div>

              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        {!sent && (
          <div className="px-5 pb-5 pt-3 flex-shrink-0" style={{ borderTop: "1px solid rgba(124,58,237,0.08)" }}>
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={handleSubmit}
              disabled={sending || !message.trim()}
              className="w-full py-3 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background:  "linear-gradient(135deg,#7c3aed,#5b21b6 50%,#3b82f6)",
                boxShadow:   "0 0 24px rgba(124,58,237,0.35)",
              }}
            >
              {sending ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending…</>
              ) : (
                <><FiSend size={13} /> Send Feedback</>
              )}
            </motion.button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
