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

export function KalenderPanel({ actions, execution }: KalenderPanelProps) {
  const kalender = actions.find((a): a is KalenderAction => a.typ === "kalender");

  if (!kalender) {
    return (
      <article className="flex h-full items-center justify-center text-sm text-zinc-500">
        Kein Kalendereintrag in den Aktionen.
      </article>
    );
  }

  const start = resolveStart(kalender);
  const end = new Date(start.getTime() + (kalender.dauer_min ?? 60) * 60_000);
  const status = execution?.status ?? "pending";
  const isDone = status === "success" || status === "mocked";
  const isError = status === "error";
  const helper = isDone
    ? "Kalendereintrag + Einladung versendet"
    : isError
      ? "Einladung konnte nicht versendet werden"
      : "Kalendereintrag + Einladung wird vorbereitet";
  const panelTone = isDone
    ? "border-sky-300 bg-sky-50"
    : isError
      ? "border-rose-300 bg-rose-50"
      : "border-zinc-700 bg-zinc-900/60";

  return (
    <article className="flex h-full flex-col">
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-zinc-50">Folgetermin</h2>
        <p className="mt-1 text-sm text-zinc-500">{helper}</p>
      </header>

      <div className={`rounded-xl border p-5 ${panelTone}`}>
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-sky-600 text-white">
            <span className="text-[10px] font-bold uppercase">
              {start.toLocaleDateString("de-DE", { month: "short" })}
            </span>
            <span className="text-xl font-bold leading-none">{start.getDate()}</span>
          </div>
          <div>
            <h3 className="font-semibold text-zinc-100">{kalender.titel}</h3>
            <p className="mt-1 text-sm text-zinc-400">
              {formatDateTime(start)} –{" "}
              {end.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </div>

        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-sky-800">Agenda</p>
          <ul className="mt-2 space-y-2">
            {DEFAULT_AGENDA.map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-2 rounded-lg border border-zinc-700/60 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-300"
              >
                <span className="mt-0.5 text-sky-500">{i + 1}.</span>
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
