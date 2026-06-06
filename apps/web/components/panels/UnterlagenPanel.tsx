"use client";

import type { ActionExecutionInfo, DemoAction, EmailEntwurfAction } from "../../lib/types";

interface UnterlagenPanelProps {
  actions: DemoAction[];
  execution?: ActionExecutionInfo;
}

function resolveExecution(execution?: ActionExecutionInfo) {
  const status = execution?.status ?? "pending";
  const isLive = status === "success" && execution?.isLive === true;
  const isMocked = status === "mocked" || (status === "success" && !isLive);
  const isError = status === "error";

  const helper = isLive
    ? "E-Mail versendet — Entwurf ausgeführt"
    : isMocked
      ? "Entwurf vorbereitet (Demo) — kein realer Versand"
      : isError
        ? "Entwurf konnte nicht ausgeführt werden"
        : "Entwurf wird vorbereitet";

  const footer = isLive
    ? "E-Mail vom Agent versendet · Anhang: Riester-Unterlagen.pdf"
    : isMocked
      ? "Entwurf vom Agent vorbereitet (Demo) · Anhang: Riester-Unterlagen.pdf"
      : isError
        ? "Fehler bei der Ausführung · Demo läuft weiter"
        : "Entwurf in Arbeit · Anhänge werden vorbereitet";

  return { isLive, isMocked, isError, helper, footer };
}

export function UnterlagenPanel({ actions, execution }: UnterlagenPanelProps) {
  const email = actions.find((a): a is EmailEntwurfAction => a.typ === "email_entwurf");

  if (!email) {
    return <article className="empty-state">Kein E-Mail-Entwurf in den Aktionen.</article>;
  }

  const { isLive, isMocked, isError, helper, footer } = resolveExecution(execution);

  return (
    <article className="flex h-full flex-col">
      <header className="panel-heading">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="panel-heading-title">Unterlagen & E-Mail</h2>
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
        </div>
        <p className="panel-heading-sub">{helper}</p>
      </header>

      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-border-subtle bg-canvas-raised/50 font-mono text-xs">
        <div className="border-b border-border-subtle bg-canvas-surface/40 px-4 py-3 text-sm font-sans">
          <div className="flex gap-2 text-ink-faint">
            <span className="w-14 shrink-0 font-medium">An:</span>
            <span className="min-w-0 truncate text-ink-muted">{email.empfaenger}</span>
          </div>
          <div className="mt-1.5 flex gap-2 text-ink-faint">
            <span className="w-14 shrink-0 font-medium">Betreff:</span>
            <span className="min-w-0 font-medium text-ink">{email.betreff}</span>
          </div>
        </div>

        <pre className="flex-1 overflow-y-auto whitespace-pre-wrap p-4 leading-relaxed text-ink-muted">
          {`Guten Tag,

anbei die Unterlagen zu ${email.betreff}.

Freundliche Grüße
Ihr Beratungsteam`}
        </pre>

        <div
          className={`border-t border-border-subtle px-4 py-2.5 font-sans text-xs ${
            isLive ? "text-sage" : isError ? "text-danger" : "text-ink-faint"
          }`}
        >
          {footer}
        </div>
      </div>
    </article>
  );
}
