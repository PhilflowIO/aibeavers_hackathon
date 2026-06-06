"use client";

import type { DemoState } from "../../lib/demo-state";

interface DemoHeaderProps {
  demoState?: DemoState;
  clientName?: string;
  meetingId?: string;
  meetingDate?: string;
}

function phaseLabel(state: DemoState | undefined): {
  text: string;
  className: string;
} {
  if (!state || state === "idle") {
    return { text: "Bereit", className: "status-pill--idle" };
  }
  if (state === "complete") {
    return { text: "Abgeschlossen", className: "status-pill--done" };
  }
  if (state === "analyzing" || state === "plan_revealing" || state === "qa_loading") {
    return { text: "Arbeitet", className: "status-pill--active" };
  }
  return { text: "Live", className: "status-pill--active" };
}

export function DemoHeader({
  demoState = "idle",
  clientName = "Thomas Berger",
  meetingId = "berger-1",
  meetingDate = "28.05.2026",
}: DemoHeaderProps) {
  const phase = phaseLabel(demoState);
  const isActive = phase.className === "status-pill--active";

  return (
    <header className="sticky top-0 z-30 border-b border-border-subtle bg-canvas/92 backdrop-blur-md">
      <div className="mx-auto max-w-[1600px] px-6 py-5 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <p className="masthead-kicker">Nacharbeits-Agent</p>
              <span
                className={`status-pill ${phase.className}`}
                aria-live="polite"
                aria-label={`Agent-Status: ${phase.text}`}
              >
                {isActive && (
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-brass animate-pulse-brass"
                    aria-hidden
                  />
                )}
                {phase.text}
              </span>
            </div>

            <h1 className="mt-2 font-display text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1] tracking-tight text-ink">
              {clientName}
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">
              Erstberatung Altersvorsorge / Riester — der Agent führt die Nacharbeit aus,
              nicht nur das Protokoll.
            </p>
          </div>

          <div className="shrink-0 rounded-lg border border-border bg-canvas-raised/80 px-4 py-3 text-right shadow-[0_1px_0_oklch(1_0_0/0.03)_inset]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
              Mandant
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold text-ink">{clientName}</p>
            <p className="mt-0.5 font-mono text-xs text-ink-faint">
              {meetingId} · {meetingDate}
            </p>
          </div>
        </div>

        <div className="editorial-rule mt-5" aria-hidden />
      </div>
    </header>
  );
}
