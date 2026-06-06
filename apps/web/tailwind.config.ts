import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        zinc: {
          50: "#0f172a",
          100: "#111827",
          200: "#1f2937",
          300: "#334155",
          400: "#475569",
          500: "#64748b",
          600: "#94a3b8",
          700: "#cbd5e1",
          800: "#e2e8f0",
          900: "#f8fafc",
          950: "#ffffff",
        },
        surface: {
          DEFAULT: "#ffffff",
          raised: "#f8fafc",
          border: "#dbe4ef",
        },
        accent: {
          DEFAULT: "#10b981",
          muted: "#059669",
          glow: "#34d399",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
