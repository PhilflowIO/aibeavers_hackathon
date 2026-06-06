"use client";

import type { ComplianceGap } from "../../lib/types";

interface ComplianceGapPanelProps {
  gaps: ComplianceGap[];
}

export function ComplianceGapPanel({ gaps }: ComplianceGapPanelProps) {
  const gap = gaps[0];

  if (!gap) {
    return (
      <article className="flex h-full items-center justify-center text-sm text-zinc-500">
        Keine Compliance-Lücken erkannt.
      </article>
    );
  }

  return (
    <article className="flex h-full flex-col">
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-zinc-50">Compliance-Prüfung</h2>
        <p className="mt-1 text-sm text-zinc-500">§34d Beratungsdokumentation</p>
      </header>

      <div className="rounded-xl border-2 border-red-500/50 bg-red-500/10 p-5 shadow-lg shadow-red-900/20">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/20 text-xl text-red-400">
            ⚠
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-red-400">
              Compliance-Lücke · {gap.severity}
            </p>
            <h3 className="mt-1 text-base font-semibold text-red-100">
              {gap.rechtsgrundlage}: Nachhaltigkeitspräferenz fehlt
            </h3>
            <p className="mt-2 text-sm text-red-200/80">
              Pflichtfeld <code className="text-red-300">{gap.feld}</code> wurde im Gespräch
              nicht erfasst. Pflicht seit {formatDate(gap.seit)}.
            </p>
            <p className="mt-3 rounded-lg bg-red-950/40 px-3 py-2 text-sm text-red-100/90">
              <span className="font-medium">Empfehlung:</span> {gap.empfehlung}
            </p>
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-zinc-500">
        Der Agent hat die ESG-Frage in die Folgetermin-Agenda übernommen.
      </p>
    </article>
  );
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}
