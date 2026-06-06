"use client";

import type { ActionExecutionInfo, DemoAction, KalenderAction } from "../../lib/types";

interface KalenderPanelProps {
  actions: DemoAction[];
  execution?: ActionExecutionInfo;
}

const DEFAULT_AGENDA = [
  "Wohn-Riester besprechen",
  "ESG / Nachhaltigkeitspräferenz nachholen (§34d)",
];

function resolveExecution(execution?: ActionExecutionInfo) {
  const status = execution?.status ?? "pending";
  const isLive = status === "success" && execution?.isLive === true;
  const isMocked = status === "mocked" || (status === "success" && !isLive);
  const isError = status === "error";

  const helper = isLive
    ? "Kalendereintrag + Einladung versendet"
    : isMocked
      ? "Kalendereintrag + Einladung vorbereitet (Demo)"
      : isError
        ? "Einladung konnte nicht versendet werden"
        : "Kalendereintrag + Einladung wird vorbereitet";

  return { status, isLive, isMocked, isError, helper };
}

export function KalenderPanel({ actions, execution }: KalenderPanelProps) {
  const kalender = actions.find((a): a is KalenderAction => a.typ === "kalender");

  if (!kalender) {
    return <article className="empty-state">Kein Kalendereintrag in den Aktionen.</article>;
  }

  const start = resolveStart(kalender);
  const end = new Date(start.getTime() + (kalender.dauer_min ?? 60) * 60_000);
  const { isLive, isMocked, isError, helper } = resolveExecution(execution);

  return (
    <article className="flex h-full flex-col">
      <header className="panel-heading">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="panel-heading-title">Folgetermin</h2>
          {isLive && (
            <span className="rounded-full border border-sage/30 bg-sage-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sage">
              Live versendet
            </span>
          )}
          {isMocked && (
            <span className="rounded-full border border-border-subtle bg-canvas-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
              Mock / Demo
            </span>
          )}
          {isError && (
            <span className="rounded-full border border-danger-border bg-danger-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-danger">
              Fehler
            </span>
          )}
        </div>
        <p className="panel-heading-sub">{helper}</p>
      </header>

      <div
        className={`rounded-xl border p-5 ${
          isLive
            ? "border-sage/30"
            : isError
              ? "border-danger-border bg-danger-muted"
              : "border-brass-glow"
        }`}
        style={
          !isError
            ? {
                backgroundColor: isLive
                  ? "color-mix(in oklch, var(--sage-muted) 55%, transparent)"
                  : "color-mix(in oklch, var(--brass-muted) 45%, transparent)",
              }
            : undefined
        }
      >
        <div className="flex items-start gap-4">
          <div
            className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg text-canvas shadow-[0_4px_12px_-4px_var(--brass-glow)] ${
              isLive ? "bg-sage" : "bg-brass"
            }`}
          >
            <span className="text-[10px] font-bold uppercase">
              {start.toLocaleDateString("de-DE", { month: "short" })}
            </span>
            <span className="text-xl font-bold leading-none">{start.getDate()}</span>
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-ink">{kalender.titel}</h3>
            <p className="mt-1 text-sm text-ink-muted">
              {formatDateTime(start)} –{" "}
              {end.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
            </p>
            {isLive && execution?.externalId && (
              <p className="mt-1 truncate font-mono text-[10px] text-ink-faint">
                {execution.externalId}
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 border-t border-border-subtle/50 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-brass">Agenda</p>
          <ol className="mt-2 space-y-0">
            {DEFAULT_AGENDA.map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-3 border-l-2 border-brass-glow py-2 pl-3 text-sm text-ink-muted"
              >
                <span className="font-mono text-xs text-brass">{String(i + 1).padStart(2, "0")}</span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
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
