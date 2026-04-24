import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import Head from "next/head";
import dynamic from "next/dynamic";
import { FiBookOpen, FiLock, FiEye, FiEyeOff, FiCheck, FiAlertCircle } from "react-icons/fi";
import { authResetPassword } from "../services/api";

const ThreeBackground = dynamic(
  () => import("../components/ThreeBackground"),
  { ssr: false }
);

const neuroCard = {
  background: "linear-gradient(145deg, #0e0b1f 0%, #080517 100%)",
  backdropFilter: "blur(40px)",
  WebkitBackdropFilter: "blur(40px)",
  border: "1px solid rgba(124,58,237,0.25)",
  boxShadow:
    "22px 22px 60px rgba(0,0,0,0.8), -10px -10px 30px rgba(28,14,60,0.45), 0 0 100px rgba(124,58,237,0.08), inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(0,0,0,0.35)",
};

function NeuroInput({ icon: Icon, type, placeholder, value, onChange }) {
  return (
    <div className="relative">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-500 text-sm pointer-events-none">
        <Icon />
      </span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-gray-100 placeholder-gray-600 border border-purple-900/40 focus:border-purple-500/70 transition-all duration-200"
        style={{
          background: "rgba(8,5,23,0.8)",
          boxShadow: "inset 2px 2px 6px rgba(0,0,0,0.5), inset -1px -1px 3px rgba(60,20,120,0.08)",
          outline: "none",
        }}
      />
    </div>
  );
}

function GlowButton({ onClick, loading, children }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full py-2.5 rounded-xl font-semibold text-sm text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
      style={{
        background: "linear-gradient(135deg, #7c3aed 0%, #5b21b6 50%, #3b82f6 100%)",
        boxShadow: "4px 4px 12px rgba(0,0,0,0.55), 0 0 22px rgba(124,58,237,0.28), inset 0 1px 0 rgba(255,255,255,0.13)",
      }}
    >
      {loading ? (
        <span className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span key={i} className="typing-dot" style={{ animationDelay: `${i * 0.16}s` }} />
          ))}
        </span>
      ) : children}
    </button>
  );
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const { token } = router.query;

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!router.isReady) return;
    if (!token) setError("Missing reset token. Please use the link from your email.");
  }, [router.isReady, token]);

  async function handleReset() {
    setError("");
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await authResetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err?.response?.data?.detail || "Something went wrong. Try requesting a new reset link.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>StudyMate AI — Reset Password</title>
      </Head>

      <ThreeBackground />

      <div className="fixed inset-0 pointer-events-none z-[1]">
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(109,40,217,0.22) 0%, transparent 70%)",
        }} />
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#030014] to-transparent" />
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-[#030014]/70 to-transparent" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-8 pt-7">
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => router.push("/login")}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{
              background: "linear-gradient(135deg, #7c3aed, #3b82f6)",
              boxShadow: "0 0 20px rgba(124,58,237,0.55)",
            }}>
              <FiBookOpen className="text-white text-base" />
            </div>
            <span className="text-sm font-bold text-white tracking-tight">StudyMate AI</span>
          </motion.div>
        </div>

        {/* Card */}
        <div className="flex-1 flex items-center justify-center px-4 py-14">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-sm"
          >
            {/* Glow halo */}
            <div className="absolute inset-0 rounded-3xl pointer-events-none card-glow-pulse" style={{ margin: "-1px" }} />

            <div className="rounded-3xl p-7 relative" style={neuroCard}>
              <AnimatePresence mode="wait">
                {done ? (
                  <motion.div
                    key="done"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center text-center gap-4 py-4"
                  >
                    <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{
                      background: "linear-gradient(135deg, rgba(16,185,129,0.2), rgba(52,211,153,0.1))",
                      border: "1px solid rgba(52,211,153,0.35)",
                      boxShadow: "0 0 24px rgba(16,185,129,0.2)",
                    }}>
                      <FiCheck className="text-emerald-400 text-2xl" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white mb-1">Password reset!</h2>
                      <p className="text-gray-400 text-sm">Your password has been updated. You can now sign in.</p>
                    </div>
                    <button
                      onClick={() => router.push("/login")}
                      className="mt-2 w-full py-2.5 rounded-xl font-semibold text-sm text-white transition-all duration-200"
                      style={{
                        background: "linear-gradient(135deg, #7c3aed 0%, #5b21b6 50%, #3b82f6 100%)",
                        boxShadow: "4px 4px 12px rgba(0,0,0,0.55), 0 0 22px rgba(124,58,237,0.28)",
                      }}
                    >
                      Go to Sign In
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col gap-5"
                  >
                    {/* Header */}
                    <div>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{
                        background: "rgba(124,58,237,0.15)",
                        border: "1px solid rgba(124,58,237,0.3)",
                        boxShadow: "0 0 16px rgba(124,58,237,0.15)",
                      }}>
                        <FiLock className="text-purple-400 text-base" />
                      </div>
                      <h2 className="text-xl font-bold text-white mb-1">Set new password</h2>
                      <p className="text-gray-500 text-xs">Choose a strong password for your account.</p>
                    </div>

                    {/* Fields */}
                    <div className="flex flex-col gap-3">
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-500 text-sm pointer-events-none z-10">
                          <FiLock />
                        </span>
                        <input
                          type={showPw ? "text" : "password"}
                          placeholder="New password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleReset()}
                          className="w-full pl-9 pr-10 py-2.5 rounded-xl text-sm text-gray-100 placeholder-gray-600 border border-purple-900/40 focus:border-purple-500/70 transition-all duration-200"
                          style={{
                            background: "rgba(8,5,23,0.8)",
                            boxShadow: "inset 2px 2px 6px rgba(0,0,0,0.5)",
                            outline: "none",
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-purple-400 transition-colors"
                        >
                          {showPw ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                        </button>
                      </div>

                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-500 text-sm pointer-events-none z-10">
                          <FiLock />
                        </span>
                        <input
                          type={showPw ? "text" : "password"}
                          placeholder="Confirm password"
                          value={confirm}
                          onChange={(e) => setConfirm(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleReset()}
                          className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-gray-100 placeholder-gray-600 border border-purple-900/40 focus:border-purple-500/70 transition-all duration-200"
                          style={{
                            background: "rgba(8,5,23,0.8)",
                            boxShadow: "inset 2px 2px 6px rgba(0,0,0,0.5)",
                            outline: "none",
                          }}
                        />
                      </div>
                    </div>

                    {/* Error */}
                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs text-red-300"
                          style={{
                            background: "rgba(239,68,68,0.08)",
                            border: "1px solid rgba(239,68,68,0.2)",
                          }}
                        >
                          <FiAlertCircle className="text-red-400 mt-0.5 flex-shrink-0" />
                          <span>{error}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <GlowButton onClick={handleReset} loading={loading}>
                      Reset Password
                    </GlowButton>

                    <button
                      onClick={() => router.push("/login")}
                      className="text-xs text-gray-600 hover:text-purple-400 transition-colors text-center"
                    >
                      Back to Sign In
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="text-center pb-6 text-xs text-gray-700"
        >
          © 2025 StudyMate AI — Built with Next.js, FastAPI & Groq
        </motion.div>
      </div>
    </>
  );
}
