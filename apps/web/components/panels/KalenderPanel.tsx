"use client";

import type { DemoAction, KalenderAction } from "../../lib/types";

interface KalenderPanelProps {
  actions: DemoAction[];
}

const DEFAULT_AGENDA = [
  "Wohn-Riester besprechen",
  "ESG / Nachhaltigkeitspräferenz nachholen (§34d)",
];

export function KalenderPanel({ actions }: KalenderPanelProps) {
  const kalender = actions.find((a): a is KalenderAction => a.typ === "kalender");

  if (!kalender) {
    return <article className="empty-state">Kein Kalendereintrag in den Aktionen.</article>;
  }

  const start = resolveStart(kalender);
  const end = new Date(start.getTime() + (kalender.dauer_min ?? 60) * 60_000);

  return (
    <article className="flex h-full flex-col">
      <header className="panel-heading">
        <h2 className="panel-heading-title">Folgetermin</h2>
        <p className="panel-heading-sub">Kalendereintrag angelegt · Einladung versendet</p>
      </header>

      <p className="mb-4 flex items-center gap-2 text-xs text-sage">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sage-muted">✓</span>
        Hero-Aktion: echte ICS-Einladung per E-Mail (Demo)
      </p>

      <div
        className="rounded-xl border border-brass-glow p-5"
        style={{ backgroundColor: "color-mix(in oklch, var(--brass-muted) 45%, transparent)" }}
      >
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-brass text-canvas shadow-[0_4px_12px_-4px_var(--brass-glow)]">
            <span className="text-[10px] font-bold uppercase">
              {start.toLocaleDateString("de-DE", { month: "short" })}
            </span>
            <span className="text-xl font-bold leading-none">{start.getDate()}</span>
          </div>
          <div>
            <h3 className="font-semibold text-ink">{kalender.titel}</h3>
            <p className="mt-1 text-sm text-ink-muted">
              {formatDateTime(start)} –{" "}
              {end.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </div>

        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-brass">Agenda</p>
          <ul className="mt-2 space-y-2">
            {DEFAULT_AGENDA.map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-2 rounded-lg border border-border-subtle bg-canvas-raised/50 px-3 py-2 text-sm text-ink-muted"
              >
                <span className="mt-0.5 font-medium text-brass">{i + 1}.</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}

function resolveStart(action: KalenderAction): Date {
  if (action.start?.startsWith("+")) {
    const days = parseInt(action.start.slice(1), 10) || 7;
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(10, 0, 0, 0);
    return d;
  }
  if (action.start) {
    const parsed = new Date(action.start);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  const fallback = new Date();
  fallback.setDate(fallback.getDate() + 7);
  fallback.setHours(10, 0, 0, 0);
  return fallback;
}

function formatDateTime(d: Date): string {
  return d.toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
