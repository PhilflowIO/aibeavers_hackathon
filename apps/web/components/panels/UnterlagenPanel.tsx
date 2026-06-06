"use client";

import type { DemoAction, EmailEntwurfAction } from "../../lib/types";

interface UnterlagenPanelProps {
  actions: DemoAction[];
}

export function UnterlagenPanel({ actions }: UnterlagenPanelProps) {
  const email = actions.find((a): a is EmailEntwurfAction => a.typ === "email_entwurf");

  if (!email) {
    return <article className="empty-state">Kein E-Mail-Entwurf in den Aktionen.</article>;
  }

  return (
    <article className="flex h-full flex-col">
      <header className="panel-heading">
        <h2 className="panel-heading-title">Unterlagen & E-Mail</h2>
        <p className="panel-heading-sub">Entwurf ausgeführt — bereit zum Versand</p>
      </header>

      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-border-subtle bg-canvas-raised/50">
        <div className="border-b border-border-subtle px-4 py-3 text-sm">
          <div className="flex gap-2 text-ink-faint">
            <span className="w-14 shrink-0 font-medium">An:</span>
            <span className="min-w-0 truncate text-ink-muted">{email.empfaenger}</span>
          </div>
          <div className="mt-1.5 flex gap-2 text-ink-faint">
            <span className="w-14 shrink-0 font-medium">Betreff:</span>
            <span className="min-w-0 font-medium text-ink">{email.betreff}</span>
          </div>
        </div>

        <pre className="flex-1 overflow-y-auto whitespace-pre-wrap p-4 font-mono text-xs leading-relaxed text-ink-muted">
          {`Guten Tag Herr Berger,

anbei die Unterlagen zu ${email.betreff}.

Freundliche Grüße
Ihr Beratungsteam`}
        </pre>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle px-4 py-2.5 text-xs">
          <span className="text-sage">Entwurf vom Agent erstellt</span>
          <span className="text-ink-faint">Anhang: Riester-Unterlagen.pdf</span>
        </div>
      </div>
    </article>
  );
}
