/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark background palette
        dark: {
          950: "#030014",
          900: "#0a0520",
          800: "#110830",
          700: "#1a0f45",
          600: "#240d5e",
        },
        // Purple neon
        purple: {
          950: "#1a0533",
          900: "#2d0a5e",
          800: "#4c1090",
          700: "#6b21a8",
          600: "#7c3aed",
          500: "#8b5cf6",
          400: "#a78bfa",
          300: "#c4b5fd",
          200: "#ddd6fe",
          100: "#ede9fe",
        },
        // Blue neon
        neon: {
          blue:   "#3b82f6",
          purple: "#7c3aed",
          indigo: "#6366f1",
          cyan:   "#06b6d4",
          pink:   "#ec4899",
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "glass": "linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
        "sidebar-gradient": "linear-gradient(180deg, #0a0520 0%, #030014 100%)",
        "card-gradient": "linear-gradient(135deg, rgba(124,58,237,0.1), rgba(59,130,246,0.05))",
      },
      boxShadow: {
        "neon-purple": "0 0 20px rgba(124,58,237,0.4), 0 0 60px rgba(124,58,237,0.1)",
        "neon-blue":   "0 0 20px rgba(59,130,246,0.4), 0 0 60px rgba(59,130,246,0.1)",
        "glass":       "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
        "card":        "0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(124,58,237,0.15)",
      },
      animation: {
        "pulse-slow":    "pulse 3s cubic-bezier(0.4,0,0.6,1) infinite",
        "float":         "float 6s ease-in-out infinite",
        "glow":          "glow 2s ease-in-out infinite alternate",
        "gradient-xy":   "gradient-xy 4s ease infinite",
        "shimmer":       "shimmer 2.5s linear infinite",
        "bounce-dots":   "bounce 1s infinite",
      },
      keyframes: {
        float: {
          "0%,100%": { transform: "translateY(0px)" },
          "50%":     { transform: "translateY(-10px)" },
        },
        glow: {
          from: { boxShadow: "0 0 10px rgba(124,58,237,0.3), 0 0 20px rgba(124,58,237,0.1)" },
          to:   { boxShadow: "0 0 20px rgba(124,58,237,0.6), 0 0 40px rgba(124,58,237,0.2)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
        mono: ["JetBrains Mono", "ui-monospace"],
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};
