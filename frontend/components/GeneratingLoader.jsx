/**
 * Animated step-by-step loader shown during AI generation.
 * Steps auto-advance every `intervalMs` milliseconds.
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiCheck, FiZap } from "react-icons/fi";

export default function GeneratingLoader({ steps, intervalMs = 3500, title = "AI is working…", subtitle }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    setCurrent(0);
    const id = setInterval(() => {
      setCurrent((c) => (c < steps.length - 1 ? c + 1 : c));
    }, intervalMs);
    return () => clearInterval(id);
  }, [steps.length, intervalMs]);

  return (
    <div className="flex flex-col items-center py-14 px-4 text-center">

      {/* Pulsing orb */}
      <div className="relative w-20 h-20 mb-8 flex-shrink-0">
        <div className="absolute inset-0 rounded-full animate-ping opacity-[0.15]"
          style={{ background: "radial-gradient(circle, #7c3aed, #3b82f6)" }} />
        <div className="absolute inset-1 rounded-full animate-ping opacity-[0.08]"
          style={{ background: "radial-gradient(circle, #7c3aed, transparent)", animationDelay: "0.3s" }} />
        <div className="absolute inset-0 rounded-full flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, rgba(124,58,237,0.25), rgba(59,130,246,0.15))",
            border: "1px solid rgba(124,58,237,0.35)",
            boxShadow: "0 0 30px rgba(124,58,237,0.2)",
          }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
          >
            <FiZap size={22} style={{ color: "#a78bfa" }} />
          </motion.div>
        </div>
      </div>

      {/* Title */}
      <h3 className="text-base font-semibold text-gray-200 mb-1">{title}</h3>
      {subtitle && <p className="text-xs text-gray-600 mb-8">{subtitle}</p>}
      {!subtitle && <div className="mb-8" />}

      {/* Steps */}
      <div className="w-full max-w-xs space-y-3 text-left">
        {steps.map((step, i) => {
          const done    = i < current;
          const active  = i === current;
          const pending = i > current;

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: pending ? 0.3 : 1, x: 0 }}
              transition={{ delay: i * 0.08, duration: 0.3 }}
              className="flex items-center gap-3"
            >
              {/* State indicator */}
              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300"
                style={done ? {
                  background: "rgba(16,185,129,0.2)", border: "1px solid rgba(16,185,129,0.4)",
                } : active ? {
                  background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.5)",
                  boxShadow: "0 0 10px rgba(124,58,237,0.3)",
                } : {
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                }}>
                {done ? (
                  <FiCheck size={11} style={{ color: "#34d399" }} />
                ) : active ? (
                  <motion.div
                    className="w-2 h-2 rounded-full"
                    style={{ background: "#a78bfa" }}
                    animate={{ scale: [1, 1.4, 1] }}
                    transition={{ duration: 0.9, repeat: Infinity }}
                  />
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.12)" }} />
                )}
              </div>

              {/* Label */}
              <span className="text-xs font-medium transition-colors duration-300"
                style={{ color: done ? "#34d399" : active ? "#e5e7eb" : "#4b5563" }}>
                {step}
              </span>

              {/* Active spinner */}
              {active && (
                <motion.span
                  className="ml-auto text-[10px] font-medium"
                  style={{ color: "#7c3aed" }}
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                >
                  working…
                </motion.span>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Thin animated bottom bar */}
      <div className="w-full max-w-xs h-0.5 mt-8 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: "linear-gradient(90deg, #7c3aed, #3b82f6)" }}
          animate={{ width: ["0%", "85%"] }}
          transition={{ duration: steps.length * intervalMs / 1000 * 0.85, ease: "easeInOut" }}
        />
      </div>
    </div>
  );
}
