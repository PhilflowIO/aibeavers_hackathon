"use client";

import type { ComplianceGap } from "../../lib/types";

interface ComplianceGapPanelProps {
  gaps: ComplianceGap[];
}

export function ComplianceGapPanel({ gaps }: ComplianceGapPanelProps) {
  if (gaps.length === 0) {
    return (
      <article className="flex h-full flex-col items-center justify-center text-center">
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-sage-muted text-sage">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path
              d="M4 10l4 4 8-8"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <p className="font-display text-base text-ink-muted">Keine Compliance-Lücken erkannt</p>
        <p className="mt-1 text-xs text-ink-faint">Alle Pflichtfelder im Gespräch abgedeckt</p>
      </article>
    );
  }

  return (
    <article className="flex h-full flex-col gap-4 overflow-y-auto">
      <header className="panel-heading">
        <h2 className="panel-heading-title">Compliance-Prüfung</h2>
        <p className="panel-heading-sub">
          Beratungsdokumentation · {gaps.length} Lücke{gaps.length > 1 ? "n" : ""}
        </p>
      </header>

      {gaps.map((gap) => (
        <GapCard key={gap.feld} gap={gap} />
      ))}

      <p className="text-xs text-ink-faint">
        Der Agent hat offene Punkte in die Folgetermin-Agenda übernommen.
      </p>
    </article>
  );
}

function GapCard({ gap }: { gap: ComplianceGap }) {
  return (
    <div className="rounded-xl border-2 border-danger-border border-l-4 border-l-danger bg-danger-muted p-5 shadow-[0_12px_32px_-16px_oklch(0_0_0/0.5)]">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-danger-border bg-canvas-raised text-danger">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path
              d="M10 6v5M10 14h.01"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
            <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-danger">
              Compliance-Lücke
            </p>
            <SeverityBadge severity={gap.severity} />
          </div>
          <h3 className="mt-1 text-base font-semibold text-ink">
            {gap.rechtsgrundlage}
          </h3>
          <p className="mt-2 text-sm text-ink-muted">
            Pflichtfeld{" "}
            <code className="rounded bg-canvas-raised px-1.5 py-0.5 font-mono text-xs text-beleg">
              {gap.feld}
            </code>{" "}
            wurde im Gespräch nicht erfasst. Pflicht seit {formatDate(gap.seit)}.
          </p>
          <p className="mt-3 rounded-lg border border-danger-border bg-canvas-raised/60 px-3 py-2.5 text-sm text-ink">
            <span className="font-medium text-ink">Empfehlung:</span> {gap.empfehlung}
          </p>
        </div>
      </div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  return (
    <span className="rounded-full border border-danger-border bg-canvas-raised px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-danger">
      {severity}
    </span>
  );
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}
