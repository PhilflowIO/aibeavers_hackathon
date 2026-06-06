"use client";

import type { ActionExecutionInfo, DemoAction, EmailEntwurfAction } from "../../lib/types";

interface UnterlagenPanelProps {
  actions: DemoAction[];
  execution?: ActionExecutionInfo;
}

export function UnterlagenPanel({ actions, execution }: UnterlagenPanelProps) {
  const email = actions.find((a): a is EmailEntwurfAction => a.typ === "email_entwurf");

  if (!email) {
    return (
      <article className="flex h-full items-center justify-center text-sm text-zinc-500">
        Kein E-Mail-Entwurf in den Aktionen.
      </article>
    );
  }
  const status = execution?.status ?? "pending";
  // Echter Live-Versand nur bei success MIT external_id.
  const isLive = status === "success" && execution?.isLive === true;
  // Mock: 'mocked' oder success ohne external_id.
  const isMocked = status === "mocked" || (status === "success" && !isLive);
  const isDone = isLive || isMocked;
  const isError = status === "error";
  const helper = isLive
    ? "E-Mail versendet — Entwurf ausgeführt"
    : isMocked
      ? "Entwurf vorbereitet (Demo) — kein realer Versand"
      : isError
        ? "Entwurf konnte nicht ausgeführt werden"
        : "Entwurf wird vorbereitet";
  const footer = isLive
    ? "✓ E-Mail vom Agent versendet · Anhänge: Riester-Unterlagen.pdf"
    : isMocked
      ? "Entwurf vom Agent vorbereitet (Demo) · Anhänge: Riester-Unterlagen.pdf"
      : isError
        ? "Fehler bei der Ausführung · Demo läuft weiter"
        : "Entwurf in Arbeit · Anhänge werden vorbereitet";

  return (
    <article className="flex h-full flex-col">
      <header className="mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-zinc-50">Unterlagen & E-Mail</h2>
          {isLive && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-800">
              Live versendet
            </span>
          )}
          {isMocked && (
            <span className="rounded-full bg-zinc-700/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Mock / Demo
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-zinc-500">{helper}</p>
      </header>

      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60">
        <div className="border-b border-zinc-800 px-4 py-3 text-sm">
          <div className="flex gap-2 text-zinc-500">
            <span className="w-12 shrink-0">An:</span>
            <span className="text-zinc-300">{email.empfaenger}</span>
          </div>
          <div className="mt-1 flex gap-2 text-zinc-500">
            <span className="w-12 shrink-0">Betreff:</span>
            <span className="font-medium text-zinc-200">{email.betreff}</span>
          </div>
        </div>

        <pre className="flex-1 overflow-y-auto whitespace-pre-wrap p-4 font-mono text-xs leading-relaxed text-zinc-400">
          {`Guten Tag,

anbei die Unterlagen zu ${email.betreff}.

Freundliche Grüße
Ihr Beratungsteam`}
        </pre>

        <div className={`border-t border-zinc-800 px-4 py-2 text-xs ${isLive ? "text-emerald-700" : isError ? "text-rose-700" : "text-zinc-400"}`}>
          {footer}
        </div>
      </div>
    </article>
  );
}
