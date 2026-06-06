import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: "var(--canvas)",
          raised: "var(--canvas-raised)",
          surface: "var(--canvas-surface)",
          overlay: "var(--canvas-overlay)",
        },
        ink: {
          DEFAULT: "var(--ink)",
          muted: "var(--ink-muted)",
          faint: "var(--ink-faint)",
        },
        border: {
          DEFAULT: "var(--border)",
          subtle: "var(--border-subtle)",
        },
        brass: {
          DEFAULT: "var(--brass)",
          hover: "var(--brass-hover)",
          muted: "var(--brass-muted)",
          glow: "var(--brass-glow)",
        },
        sage: {
          DEFAULT: "var(--sage)",
          muted: "var(--sage-muted)",
        },
        warn: {
          DEFAULT: "var(--amber-warn)",
          muted: "var(--amber-warn-muted)",
        },
        beleg: {
          DEFAULT: "var(--beleg)",
          muted: "var(--beleg-muted)",
          border: "var(--beleg-border)",
        },
        speaker: {
          advisor: "var(--speaker-advisor)",
          client: "var(--speaker-client)",
        },
        cross: {
          DEFAULT: "var(--accent-cross)",
          muted: "var(--accent-cross-muted)",
          border: "var(--accent-cross-border)",
        },
        danger: {
          DEFAULT: "var(--danger)",
          muted: "var(--danger-muted)",
          border: "var(--danger-border)",
        },
        highlight: {
          DEFAULT: "var(--highlight)",
          ring: "var(--highlight-ring)",
        },
      },
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
      },
    },
  },
  plugins: [],
};

export default config;
