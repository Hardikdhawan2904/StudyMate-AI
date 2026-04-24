import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiMail, FiLock, FiUser, FiEye, FiEyeOff,
  FiArrowRight, FiAlertCircle, FiArrowLeft,
  FiCheckCircle, FiRefreshCw,
} from "react-icons/fi";
import {
  authSignup, authLogin, authVerifyOtp,
  authResendOtp, authForgotPassword, authResetPassword,
} from "../services/api";

// ── Neuromorphic style objects ────────────────────────────────────────────────

const neuroCard = {
  background: "linear-gradient(145deg, #0e0b1f 0%, #080517 100%)",
  boxShadow: [
    "22px 22px 55px #04020c",
    "-10px -10px 28px rgba(28,14,60,0.5)",
    "0 0 90px rgba(124,58,237,0.07)",
    "inset 0 1px 0 rgba(255,255,255,0.055)",
    "inset 0 -1px 0 rgba(0,0,0,0.35)",
  ].join(", "),
  border: "1px solid rgba(124,58,237,0.22)",
  borderRadius: "24px",
  padding: "24px 20px",
  display: "flex",
  flexDirection: "column",
};

const neuroInput = {
  background: "linear-gradient(145deg, #060310, #0c091b)",
  boxShadow: [
    "inset 5px 5px 12px rgba(0,0,0,0.75)",
    "inset -2px -2px 6px rgba(22,10,50,0.35)",
  ].join(", "),
  border: "1px solid rgba(124,58,237,0.13)",
  borderRadius: "12px",
  color: "#e5e0ff",
  fontSize: "14px",
  width: "100%",
  padding: "12px 16px 12px 44px",
  outline: "none",
  transition: "all 0.22s ease",
};

const neuroInputFocus = {
  ...neuroInput,
  border: "1px solid rgba(124,58,237,0.6)",
  boxShadow: [
    "inset 5px 5px 12px rgba(0,0,0,0.75)",
    "inset -2px -2px 6px rgba(22,10,50,0.35)",
    "0 0 18px rgba(124,58,237,0.22)",
  ].join(", "),
};

const neuroOtpInput = {
  background: "linear-gradient(145deg, #060310, #0c091b)",
  boxShadow: [
    "inset 4px 4px 10px rgba(0,0,0,0.7)",
    "inset -2px -2px 5px rgba(22,10,50,0.3)",
  ].join(", "),
  border: "1px solid rgba(124,58,237,0.15)",
  borderRadius: "12px",
  color: "#c4b5fd",
  fontSize: "22px",
  fontWeight: "700",
  textAlign: "center",
  width: "46px",
  height: "54px",
  outline: "none",
  transition: "all 0.2s ease",
};

const neuroOtpFocused = {
  ...neuroOtpInput,
  border: "1px solid rgba(139,92,246,0.7)",
  boxShadow: [
    "inset 4px 4px 10px rgba(0,0,0,0.7)",
    "inset -2px -2px 5px rgba(22,10,50,0.3)",
    "0 0 14px rgba(124,58,237,0.3)",
  ].join(", "),
};

const neuroOtpFilled = {
  ...neuroOtpInput,
  border: "1px solid rgba(167,139,250,0.5)",
  color: "#a78bfa",
};

const neuroTabBar = {
  background: "linear-gradient(145deg, #060310, #0c091b)",
  boxShadow: [
    "inset 4px 4px 10px rgba(0,0,0,0.6)",
    "inset -2px -2px 5px rgba(22,10,50,0.25)",
  ].join(", "),
  border: "1px solid rgba(124,58,237,0.12)",
  borderRadius: "14px",
  padding: "4px",
  display: "flex",
  marginBottom: "28px",
};

const neuroTabActive = {
  background: "linear-gradient(135deg, #7c3aed, #5b21b6 50%, #3b82f6)",
  boxShadow: [
    "3px 3px 8px rgba(0,0,0,0.5)",
    "-1px -1px 5px rgba(120,70,240,0.2)",
    "0 0 16px rgba(124,58,237,0.35)",
    "inset 0 1px 0 rgba(255,255,255,0.15)",
  ].join(", "),
  borderRadius: "10px",
  color: "#fff",
  fontWeight: 600,
  fontSize: "13px",
  flex: 1,
  padding: "9px 0",
  border: "none",
  cursor: "pointer",
  transition: "all 0.25s ease",
};

const neuroTabInactive = {
  background: "transparent",
  border: "none",
  color: "#6b7280",
  fontWeight: 500,
  fontSize: "13px",
  flex: 1,
  padding: "9px 0",
  cursor: "pointer",
  borderRadius: "10px",
  transition: "all 0.25s ease",
};

// ── Animation variants ────────────────────────────────────────────────────────

const slideVariants = {
  enter: { opacity: 0, y: 18, scale: 0.98 },
  center: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -12, scale: 0.98 },
};

const transition = { duration: 0.3, ease: [0.16, 1, 0.3, 1] };

// ── Sub-components ────────────────────────────────────────────────────────────

function NeuroInput({ icon: Icon, type, placeholder, value, onChange, autoComplete, rightSlot, focusedState }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <span style={{
        position: "absolute", left: "14px", top: "50%",
        transform: "translateY(-50%)", color: focused ? "#8b5cf6" : "#4b5563",
        transition: "color 0.2s", pointerEvents: "none", display: "flex",
      }}>
        <Icon size={15} />
      </span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={focused ? neuroInputFocus : neuroInput}
      />
      {rightSlot && (
        <span style={{
          position: "absolute", right: "14px", top: "50%",
          transform: "translateY(-50%)", display: "flex",
        }}>
          {rightSlot}
        </span>
      )}
    </div>
  );
}

function GlowButton({ onClick, type = "button", disabled, loading, children, variant = "primary" }) {
  const [hovered, setHovered] = useState(false);

  const base = {
    width: "100%", height: "48px",
    display: "flex", alignItems: "center", justifyContent: "center",
    gap: "8px", borderRadius: "12px", border: "none",
    fontWeight: 600, fontSize: "14px", cursor: disabled ? "not-allowed" : "pointer",
    transition: "all 0.22s ease",
    position: "relative", overflow: "hidden",
  };

  const primaryStyle = {
    ...base,
    background: hovered && !disabled
      ? "linear-gradient(135deg, #8b5cf6, #6d28d9 50%, #60a5fa)"
      : "linear-gradient(135deg, #7c3aed, #5b21b6 50%, #3b82f6)",
    boxShadow: hovered && !disabled
      ? ["5px 5px 15px rgba(0,0,0,0.6)", "-2px -2px 8px rgba(130,80,250,0.18)", "0 0 30px rgba(124,58,237,0.5)", "0 0 60px rgba(59,130,246,0.15)", "inset 0 1px 0 rgba(255,255,255,0.18)"].join(", ")
      : ["4px 4px 12px rgba(0,0,0,0.55)", "-2px -2px 6px rgba(100,60,200,0.15)", "0 0 20px rgba(124,58,237,0.32)", "inset 0 1px 0 rgba(255,255,255,0.12)"].join(", "),
    transform: hovered && !disabled ? "translateY(-2px) scale(1.01)" : "translateY(0) scale(1)",
    color: "#fff",
    opacity: disabled ? 0.45 : 1,
  };

  const ghostStyle = {
    ...base,
    background: "transparent",
    border: "1px solid rgba(124,58,237,0.3)",
    color: hovered ? "#c4b5fd" : "#8b5cf6",
    boxShadow: hovered ? "0 0 12px rgba(124,58,237,0.2)" : "none",
    transform: hovered ? "translateY(-1px)" : "none",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={variant === "ghost" ? ghostStyle : primaryStyle}
    >
      {loading ? (
        <>
          <span style={{
            width: 16, height: 16, border: "2px solid rgba(255,255,255,0.25)",
            borderTopColor: "#fff", borderRadius: "50%",
            animation: "spin 0.7s linear infinite",
            display: "inline-block",
          }} />
          {children}
        </>
      ) : children}
    </button>
  );
}

function ErrorMsg({ msg }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      style={{
        display: "flex", alignItems: "center", gap: "8px",
        padding: "10px 14px", borderRadius: "10px",
        background: "rgba(127,29,29,0.2)", border: "1px solid rgba(185,28,28,0.35)",
        color: "#fca5a5", fontSize: "12px",
      }}
    >
      <FiAlertCircle style={{ flexShrink: 0 }} />
      {msg}
    </motion.div>
  );
}

function SuccessMsg({ msg }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: "flex", alignItems: "center", gap: "8px",
        padding: "10px 14px", borderRadius: "10px",
        background: "rgba(6,78,59,0.2)", border: "1px solid rgba(16,185,129,0.3)",
        color: "#6ee7b7", fontSize: "12px",
      }}
    >
      <FiCheckCircle style={{ flexShrink: 0 }} />
      {msg}
    </motion.div>
  );
}

// ── OTP Input ─────────────────────────────────────────────────────────────────

function OTPBoxes({ value, onChange }) {
  const inputsRef = useRef([]);
  const digits = value.padEnd(6, " ").slice(0, 6).split("");

  const handleKey = (idx, e) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const arr = value.split("");
      if (arr[idx] && arr[idx] !== " ") {
        arr[idx] = "";
        onChange(arr.join("").replace(/ /g, ""));
      } else if (idx > 0) {
        arr[idx - 1] = "";
        onChange(arr.join("").replace(/ /g, ""));
        inputsRef.current[idx - 1]?.focus();
      }
    }
  };

  const handleChange = (idx, e) => {
    const char = e.target.value.replace(/\D/g, "").slice(-1);
    if (!char) return;
    const arr = value.padEnd(6, "").split("").slice(0, 6);
    arr[idx] = char;
    const newVal = arr.join("").replace(/ /g, "").slice(0, 6);
    onChange(newVal);
    if (idx < 5) inputsRef.current[idx + 1]?.focus();
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted) {
      onChange(pasted);
      const focusIdx = Math.min(pasted.length, 5);
      inputsRef.current[focusIdx]?.focus();
    }
    e.preventDefault();
  };

  return (
    <div className="otp-grid">
      {Array.from({ length: 6 }).map((_, i) => {
        const filled = i < value.length;
        return (
          <input
            key={i}
            ref={(el) => (inputsRef.current[i] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={filled ? value[i] : ""}
            onChange={(e) => handleChange(i, e)}
            onKeyDown={(e) => handleKey(i, e)}
            onPaste={handlePaste}
            onFocus={(e) => e.target.select()}
            className="otp-box"
            style={filled ? neuroOtpFilled : neuroOtpInput}
            onMouseOver={(e) => { Object.assign(e.target.style, neuroOtpFocused); }}
            onMouseOut={(e) => { Object.assign(e.target.style, filled ? neuroOtpFilled : neuroOtpInput); }}
          />
        );
      })}
    </div>
  );
}

// ── Label ─────────────────────────────────────────────────────────────────────

function FieldLabel({ children }) {
  return (
    <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#6b7280", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
      {children}
    </label>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export default function LoginForm() {
  const router = useRouter();

  // view: "signin" | "signup" | "otp" | "forgot" | "forgot_sent"
  const [view, setView]               = useState("signin");
  const [tab, setTab]                 = useState("signin"); // track tab independently

  const [name, setName]               = useState("");
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [otp, setOtp]                 = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetOtp, setResetOtp]       = useState("");
  const [newPass, setNewPass]         = useState("");
  const [newPassConfirm, setNewPassConfirm] = useState("");
  const [showNewPass, setShowNewPass] = useState(false);

  const [showPass, setShowPass]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [success, setSuccess]         = useState("");

  // OTP resend countdown
  const [countdown, setCountdown]     = useState(0);
  const countdownRef                  = useRef(null);

  const startCountdown = useCallback(() => {
    setCountdown(60);
    clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(countdownRef.current); return 0; }
        return c - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => () => clearInterval(countdownRef.current), []);

  const clearMessages = () => { setError(""); setSuccess(""); };

  const switchTab = (t) => {
    setTab(t);
    setView(t);
    clearMessages();
  };

  // ── Sign In ────────────────────────────────────────────────────────────────

  const handleSignIn = async (e) => {
    e.preventDefault();
    clearMessages();
    if (!isValidEmail(email)) return setError("Enter a valid email address.");
    if (password.length < 6)  return setError("Password must be at least 6 characters.");

    setLoading(true);
    try {
      const data = await authLogin(email, password);
      localStorage.setItem("studymate_auth", JSON.stringify({ ...data.user, loginTime: Date.now() }));
      router.push("/dashboard");
    } catch (err) {
      const msg = err?.response?.data?.detail || "Invalid email or password. Please try again.";
      if (msg.toLowerCase().includes("not verified")) {
        setError(msg);
        setView("otp");
        startCountdown();
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Sign Up ────────────────────────────────────────────────────────────────

  const handleSignUp = async (e) => {
    e.preventDefault();
    clearMessages();
    if (name.trim().length < 2)      return setError("Please enter your full name.");
    if (!isValidEmail(email))        return setError("Enter a valid email address.");
    if (password.length < 6)         return setError("Password must be at least 6 characters.");
    if (password !== confirmPass)    return setError("Passwords do not match.");

    setLoading(true);
    try {
      await authSignup(name, email, password);
      setView("otp");
      startCountdown();
      setSuccess("Account created! Check your email for the verification code.");
    } catch (err) {
      setError(err?.response?.data?.detail || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── OTP Verify ────────────────────────────────────────────────────────────

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    clearMessages();
    if (otp.length !== 6) return setError("Please enter the complete 6-digit code.");

    setLoading(true);
    try {
      const data = await authVerifyOtp(email, otp);
      setSuccess("Email verified!");
      setTimeout(() => {
        localStorage.setItem("studymate_auth", JSON.stringify({ ...data.user, loginTime: Date.now() }));
        router.push("/dashboard");
      }, 800);
    } catch (err) {
      setError(err?.response?.data?.detail || "Invalid or expired code.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    clearMessages();
    try {
      await authResendOtp(email);
      startCountdown();
      setSuccess("New code sent to your email.");
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not resend code.");
    }
  };

  // ── Forgot Password ───────────────────────────────────────────────────────

  const handleForgot = async (e) => {
    e.preventDefault();
    clearMessages();
    if (!isValidEmail(forgotEmail)) return setError("Enter a valid email address.");

    setLoading(true);
    try {
      await authForgotPassword(forgotEmail);
      setResetOtp(""); setNewPass(""); setNewPassConfirm("");
      setView("forgot_sent");
    } catch {
      setResetOtp(""); setNewPass(""); setNewPassConfirm("");
      setView("forgot_sent"); // always succeed
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    clearMessages();
    if (resetOtp.length !== 6) return setError("Enter the complete 6-digit code.");
    if (newPass.length < 6)    return setError("Password must be at least 6 characters.");
    if (newPass !== newPassConfirm) return setError("Passwords do not match.");

    setLoading(true);
    try {
      await authResetPassword(forgotEmail, resetOtp, newPass);
      setSuccess("Password reset! You can now sign in.");
      setTimeout(() => { setView("signin"); setTab("signin"); clearMessages(); }, 1500);
    } catch (err) {
      setError(err?.response?.data?.detail || "Invalid or expired code.");
    } finally {
      setLoading(false);
    }
  };

  // ── Heading by view ───────────────────────────────────────────────────────

  const headings = {
    signin:      { title: "Welcome Back!",       sub: "Sign in to your study space" },
    signup:      { title: "Hello, Friend!",      sub: "Create your StudyMate account" },
    otp:         { title: "Verify Your Email",   sub: `We sent a code to ${email}` },
    forgot:      { title: "Reset Your Password", sub: "Enter your email to receive a reset code" },
    forgot_sent: { title: "Check Your Email",    sub: `Enter the 6-digit code sent to ${forgotEmail}` },
  };

  const { title, sub } = headings[view];
  const showTabs = view === "signin" || view === "signup";

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      style={neuroCard}
    >
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        ::placeholder { color: #374151; }
        .otp-grid { display: flex; gap: 8px; justify-content: center; }
        @media (max-width: 360px) {
          .otp-grid { gap: 5px; }
          .otp-box  { width: 38px !important; height: 48px !important; font-size: 18px !important; }
        }
      `}</style>

      {/* Tabs */}
      {showTabs && (
        <div style={neuroTabBar}>
          {["signin", "signup"].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => switchTab(t)}
              style={tab === t ? neuroTabActive : neuroTabInactive}
            >
              {t === "signin" ? "Sign In" : "Sign Up"}
            </button>
          ))}
        </div>
      )}

      {/* Heading */}
      <AnimatePresence mode="wait">
        <motion.div
          key={view + "-heading"}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          style={{ marginBottom: "24px" }}
        >
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#f5f3ff", marginBottom: "4px" }}>
            {title}
          </h2>
          <p style={{ fontSize: "12px", color: "#6b7280" }}>{sub}</p>
        </motion.div>
      </AnimatePresence>

      {/* View content */}
      <AnimatePresence mode="wait">

        {/* ── Sign In ─────────────────────────────────────────────────────── */}
        {view === "signin" && (
          <motion.form
            key="signin"
            variants={slideVariants}
            initial="enter" animate="center" exit="exit"
            transition={transition}
            onSubmit={handleSignIn}
            style={{ display: "flex", flexDirection: "column", gap: "14px" }}
          >
            <div>
              <FieldLabel>Email Address</FieldLabel>
              <NeuroInput
                icon={FiMail} type="email" placeholder="you@example.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div>
              <FieldLabel>Password</FieldLabel>
              <NeuroInput
                icon={FiLock}
                type={showPass ? "text" : "password"}
                placeholder="Your password"
                value={password} onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                rightSlot={
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    style={{ color: "#6b7280", background: "none", border: "none", cursor: "pointer", display: "flex" }}>
                    {showPass ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                  </button>
                }
              />
            </div>

            <div style={{ textAlign: "right" }}>
              <button type="button" onClick={() => { clearMessages(); setForgotEmail(email); setView("forgot"); }}
                style={{ background: "none", border: "none", color: "#8b5cf6", fontSize: "12px", cursor: "pointer", padding: 0 }}>
                Forgot password?
              </button>
            </div>

            <AnimatePresence>{error && <ErrorMsg msg={error} />}</AnimatePresence>

            <GlowButton type="submit" disabled={loading} loading={loading}>
              {loading ? "Signing in…" : <><span>Sign In</span><FiArrowRight /></>}
            </GlowButton>
          </motion.form>
        )}

        {/* ── Sign Up ─────────────────────────────────────────────────────── */}
        {view === "signup" && (
          <motion.form
            key="signup"
            variants={slideVariants}
            initial="enter" animate="center" exit="exit"
            transition={transition}
            onSubmit={handleSignUp}
            style={{ display: "flex", flexDirection: "column", gap: "14px" }}
          >
            <div>
              <FieldLabel>Full Name</FieldLabel>
              <NeuroInput
                icon={FiUser} type="text" placeholder="Your name"
                value={name} onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>

            <div>
              <FieldLabel>Email Address</FieldLabel>
              <NeuroInput
                icon={FiMail} type="email" placeholder="you@example.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div>
              <FieldLabel>Password</FieldLabel>
              <NeuroInput
                icon={FiLock}
                type={showPass ? "text" : "password"}
                placeholder="Min. 6 characters"
                value={password} onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                rightSlot={
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    style={{ color: "#6b7280", background: "none", border: "none", cursor: "pointer", display: "flex" }}>
                    {showPass ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                  </button>
                }
              />
            </div>

            <div>
              <FieldLabel>Confirm Password</FieldLabel>
              <NeuroInput
                icon={FiLock}
                type={showConfirm ? "text" : "password"}
                placeholder="Repeat password"
                value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)}
                autoComplete="new-password"
                rightSlot={
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                    style={{ color: "#6b7280", background: "none", border: "none", cursor: "pointer", display: "flex" }}>
                    {showConfirm ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                  </button>
                }
              />
            </div>

            <AnimatePresence>{error && <ErrorMsg msg={error} />}</AnimatePresence>

            <GlowButton type="submit" disabled={loading} loading={loading}>
              {loading ? "Creating account…" : <><span>Create Account</span><FiArrowRight /></>}
            </GlowButton>
          </motion.form>
        )}

        {/* ── OTP Verification ────────────────────────────────────────────── */}
        {view === "otp" && (
          <motion.form
            key="otp"
            variants={slideVariants}
            initial="enter" animate="center" exit="exit"
            transition={transition}
            onSubmit={handleVerifyOtp}
            style={{ display: "flex", flexDirection: "column", gap: "20px" }}
          >
            {/* email badge */}
            <div style={{
              display: "flex", alignItems: "center", gap: "8px",
              padding: "10px 14px", borderRadius: "10px",
              background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)",
              fontSize: "12px", color: "#a78bfa",
            }}>
              <FiMail size={13} />
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email}</span>
            </div>

            <div>
              <FieldLabel>Verification Code</FieldLabel>
              <OTPBoxes value={otp} onChange={setOtp} />
            </div>

            <AnimatePresence>
              {error   && <ErrorMsg msg={error} />}
              {success && <SuccessMsg msg={success} />}
            </AnimatePresence>

            <GlowButton type="submit" disabled={loading || otp.length < 6} loading={loading}>
              {loading ? "Verifying…" : <><span>Verify Email</span><FiCheckCircle /></>}
            </GlowButton>

            {/* Resend */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
              <span style={{ fontSize: "12px", color: "#6b7280" }}>Didn't get it?</span>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={countdown > 0}
                style={{
                  background: "none", border: "none", cursor: countdown > 0 ? "not-allowed" : "pointer",
                  color: countdown > 0 ? "#4b5563" : "#8b5cf6",
                  fontSize: "12px", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px",
                  transition: "color 0.2s",
                }}
              >
                <FiRefreshCw size={11} />
                {countdown > 0 ? `Resend in ${countdown}s` : "Resend code"}
              </button>
            </div>

            {/* Back / change email */}
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button type="button" onClick={() => { setView("signup"); setTab("signup"); clearMessages(); setOtp(""); }}
                style={{ background: "none", border: "none", color: "#6b7280", fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                <FiArrowLeft size={12} /> Change email
              </button>
              <button type="button" onClick={() => { setView("signin"); setTab("signin"); clearMessages(); setOtp(""); }}
                style={{ background: "none", border: "none", color: "#6b7280", fontSize: "12px", cursor: "pointer" }}>
                Back to Sign In
              </button>
            </div>
          </motion.form>
        )}

        {/* ── Forgot Password ──────────────────────────────────────────────── */}
        {view === "forgot" && (
          <motion.form
            key="forgot"
            variants={slideVariants}
            initial="enter" animate="center" exit="exit"
            transition={transition}
            onSubmit={handleForgot}
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            <div>
              <FieldLabel>Email Address</FieldLabel>
              <NeuroInput
                icon={FiMail} type="email" placeholder="you@example.com"
                value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <AnimatePresence>{error && <ErrorMsg msg={error} />}</AnimatePresence>

            <GlowButton type="submit" disabled={loading} loading={loading}>
              {loading ? "Sending…" : <><span>Send Reset Code</span><FiArrowRight /></>}
            </GlowButton>

            <button type="button" onClick={() => { setView("signin"); clearMessages(); }}
              style={{ background: "none", border: "none", color: "#6b7280", fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", justifyContent: "center" }}>
              <FiArrowLeft size={12} /> Back to Sign In
            </button>
          </motion.form>
        )}

        {/* ── Forgot Sent — OTP + new password ────────────────────────────── */}
        {view === "forgot_sent" && (
          <motion.form
            key="forgot_sent"
            variants={slideVariants}
            initial="enter" animate="center" exit="exit"
            transition={transition}
            onSubmit={handleResetPassword}
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            {/* email badge */}
            <div style={{
              display: "flex", alignItems: "center", gap: "8px",
              padding: "10px 14px", borderRadius: "10px",
              background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)",
              fontSize: "12px", color: "#a78bfa",
            }}>
              <FiMail size={13} />
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{forgotEmail}</span>
            </div>

            <div>
              <FieldLabel>Reset Code</FieldLabel>
              <OTPBoxes value={resetOtp} onChange={setResetOtp} />
            </div>

            <div>
              <FieldLabel>New Password</FieldLabel>
              <NeuroInput
                icon={FiLock}
                type={showNewPass ? "text" : "password"}
                placeholder="Min. 6 characters"
                value={newPass} onChange={(e) => setNewPass(e.target.value)}
                autoComplete="new-password"
                rightSlot={
                  <button type="button" onClick={() => setShowNewPass(!showNewPass)}
                    style={{ color: "#6b7280", background: "none", border: "none", cursor: "pointer", display: "flex" }}>
                    {showNewPass ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                  </button>
                }
              />
            </div>

            <div>
              <FieldLabel>Confirm Password</FieldLabel>
              <NeuroInput
                icon={FiLock}
                type={showNewPass ? "text" : "password"}
                placeholder="Repeat password"
                value={newPassConfirm} onChange={(e) => setNewPassConfirm(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            <AnimatePresence>
              {error   && <ErrorMsg msg={error} />}
              {success && <SuccessMsg msg={success} />}
            </AnimatePresence>

            <GlowButton type="submit" disabled={loading || resetOtp.length < 6} loading={loading}>
              {loading ? "Resetting…" : <><span>Reset Password</span><FiArrowRight /></>}
            </GlowButton>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button type="button" onClick={() => { setView("forgot"); clearMessages(); setResetOtp(""); }}
                style={{ background: "none", border: "none", color: "#6b7280", fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                <FiArrowLeft size={12} /> Resend code
              </button>
              <button type="button" onClick={() => { setView("signin"); setTab("signin"); clearMessages(); }}
                style={{ background: "none", border: "none", color: "#6b7280", fontSize: "12px", cursor: "pointer" }}>
                Back to Sign In
              </button>
            </div>
          </motion.form>
        )}

      </AnimatePresence>

    </motion.div>
  );
}
