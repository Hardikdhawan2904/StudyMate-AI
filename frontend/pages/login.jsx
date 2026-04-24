import dynamic from "next/dynamic";
import { useEffect } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import Head from "next/head";
import LoginForm from "../components/LoginForm";
import { FiBookOpen, FiZap, FiAward, FiLayers } from "react-icons/fi";

const ThreeBackground = dynamic(
  () => import("../components/ThreeBackground"),
  { ssr: false }
);

const features = [
  { icon: FiZap,      label: "Ask AI",     desc: "Chat with your notes" },
  { icon: FiBookOpen, label: "Summary",    desc: "Key concepts & bullets" },
  { icon: FiAward,    label: "Quiz",       desc: "Auto-generated MCQs" },
  { icon: FiLayers,   label: "Flashcards", desc: "Flip card study mode" },
];

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    try {
      const auth = localStorage.getItem("studymate_auth");
      if (auth) router.replace("/dashboard");
    } catch {}
  }, [router]);

  return (
    <>
      <Head>
        <title>StudyMate AI — Sign In</title>
        <meta name="description" content="AI-powered study assistant" />
      </Head>

      <ThreeBackground />

      {/* Gradient overlays */}
      <div className="fixed inset-0 pointer-events-none z-[1]">
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(109,40,217,0.22) 0%, transparent 70%)",
        }} />
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse 40% 50% at 75% 55%, rgba(59,130,246,0.08) 0%, transparent 60%)",
        }} />
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#030014] to-transparent" />
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-[#030014]/70 to-transparent" />
      </div>

      {/* Page content */}
      <div className="relative z-10 min-h-screen flex flex-col">

        {/* Top bar */}
        <div className="flex items-center justify-between px-4 sm:px-8 pt-5 sm:pt-7">
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{
              background: "linear-gradient(135deg, #7c3aed, #3b82f6)",
              boxShadow: "0 0 20px rgba(124,58,237,0.55)",
            }}>
              <FiBookOpen className="text-white text-base" />
            </div>
            <span className="text-sm font-bold text-white tracking-tight">StudyMate AI</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex items-center gap-1.5 text-xs text-purple-300 px-3 py-1.5 rounded-full border border-purple-500/20"
            style={{ background: "rgba(124,58,237,0.1)", backdropFilter: "blur(12px)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            Made by Hardik Dhawan
          </motion.div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex justify-center px-4 py-4 sm:py-14">
          <div className="w-full max-w-5xl flex flex-col lg:flex-row lg:items-start gap-6 lg:gap-16">

            {/* Left: hidden on mobile, visible on large screens */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="hidden lg:flex flex-1 flex-col justify-center text-left"
              style={{ minHeight: 0 }}
            >
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs text-purple-300 mb-6 border border-purple-700/25"
                style={{ background: "rgba(124,58,237,0.1)", backdropFilter: "blur(12px)" }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                AI-Powered Study Assistant
              </motion.div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-white leading-[1.1] mb-5">
                Study Smarter
                <br />
                <span className="gradient-text">with AI</span>
              </h1>

              <p className="text-gray-400 text-base lg:text-lg leading-relaxed mb-10 max-w-md mx-auto lg:mx-0">
                Upload your notes, ask questions, generate quizzes, and create
                flashcards — all powered by Retrieval-Augmented Generation.
              </p>

              {/* Feature cards */}
              <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto lg:mx-0">
                {features.map(({ icon: Icon, label, desc }, i) => (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.3 + i * 0.07 }}
                    whileHover={{ scale: 1.04, y: -3 }}
                    className="feature-card-login p-3.5"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          background: "rgba(124,58,237,0.18)",
                          border: "1px solid rgba(124,58,237,0.25)",
                          boxShadow: "0 0 10px rgba(124,58,237,0.12)",
                        }}>
                        <Icon className="text-purple-400 text-sm" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-200">{label}</p>
                        <p className="text-xs text-gray-600">{desc}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

            </motion.div>

            {/* Right: Auth card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="w-full max-w-sm mx-auto lg:mx-0 flex-shrink-0 relative self-start"
            >
              {/* Outer glow ring — pulsing neon halo */}
              <div
                className="absolute inset-0 rounded-3xl pointer-events-none card-glow-pulse"
                style={{ margin: "-1px" }}
              />
              {/* Secondary soft blue accent */}
              <div className="absolute -bottom-6 -right-6 w-48 h-48 rounded-full pointer-events-none"
                style={{
                  background: "radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)",
                  filter: "blur(20px)",
                }}
              />
              <div className="absolute -top-6 -left-6 w-40 h-40 rounded-full pointer-events-none"
                style={{
                  background: "radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)",
                  filter: "blur(20px)",
                }}
              />
              <LoginForm />
            </motion.div>

          </div>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="text-center pb-6 text-xs text-gray-700"
        >
          © 2026 StudyMate AI
        </motion.div>
      </div>
    </>
  );
}
