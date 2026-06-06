"use client";

import { useEffect, useState } from "react";

interface AnalyzingOverlayProps {
  visible: boolean;
}

const STEPS = [
  "Protokoll extrahieren",
  "Compliance prüfen",
  "Verkaufschancen erkennen",
  "Aktionen planen",
] as const;

export function AnalyzingOverlay({ visible }: AnalyzingOverlayProps) {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (!visible) {
      setActiveStep(0);
      return;
    }
    const id = window.setInterval(() => {
      setActiveStep((i) => (i + 1) % STEPS.length);
    }, 1400);
    return () => window.clearInterval(id);
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-canvas-overlay backdrop-blur-[3px]"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex max-w-sm flex-col items-center gap-5 rounded-xl border border-border bg-canvas-raised px-10 py-8 shadow-[var(--shadow-panel)]">
        <div className="relative h-14 w-14" aria-hidden>
          <span className="absolute inset-0 animate-ping rounded-full bg-brass-muted opacity-40" />
          <span className="relative flex h-14 w-14 items-center justify-center rounded-full border border-brass-glow bg-brass-muted">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-brass/25 border-t-brass" />
          </span>
        </div>
        <div className="text-center">
          <p className="font-display text-lg text-ink">Gespräch wird analysiert</p>
          <ul className="mt-4 space-y-1.5 text-left text-sm" aria-label="Analyse-Schritte">
            {STEPS.map((label, i) => {
              const active = i === activeStep;
              return (
                <li
                  key={label}
                  className={
                    active
                      ? "text-ink animate-analyze-tick"
                      : i < activeStep
                        ? "text-sage"
                        : "text-ink-faint"
                  }
                >
                  {i < activeStep ? "✓ " : active ? "→ " : "· "}
                  {label}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
