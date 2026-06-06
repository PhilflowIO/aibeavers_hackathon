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
  const isDone = status === "success" || status === "mocked";
  const isError = status === "error";
  const helper = isDone
    ? "Entwurf ausgeführt — bereit zum Versand"
    : isError
      ? "Entwurf konnte nicht ausgeführt werden"
      : "Entwurf wird vorbereitet";
  const footer = isDone
    ? "✓ Entwurf vom Agent erstellt · Anhänge: Riester-Unterlagen.pdf"
    : isError
      ? "Fehler bei der Ausführung · Demo läuft weiter"
      : "Entwurf in Arbeit · Anhänge werden vorbereitet";

  return (
    <article className="flex h-full flex-col">
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-zinc-50">Unterlagen & E-Mail</h2>
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

        <div className={`border-t border-zinc-800 px-4 py-2 text-xs ${isDone ? "text-emerald-500/90" : isError ? "text-rose-300" : "text-zinc-400"}`}>
          {footer}
        </div>
      </div>
    </article>
  );
}
