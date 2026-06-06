"use client";

import type { CrossSellSignal, Meeting } from "../../lib/types";
import { BelegChips } from "../grounding/BelegChips";

interface CrossSellPanelProps {
  signals: CrossSellSignal[];
  meetings?: Meeting[];
}

export function CrossSellPanel({ signals, meetings }: CrossSellPanelProps) {
  if (signals.length === 0) {
    return (
      <article className="flex h-full flex-col items-center justify-center text-center">
        <p className="font-display text-base text-ink-muted">Keine Verkaufschancen erkannt</p>
        <p className="mt-1 text-xs text-ink-faint">Kein beiläufiges Lebensereignis im Transkript</p>
      </article>
    );
  }

  return (
    <article className="flex h-full flex-col gap-4 overflow-y-auto">
      <header className="panel-heading">
        <h2 className="panel-heading-title">Verkaufschancen</h2>
        <p className="panel-heading-sub">
          {signals.length} Signal{signals.length > 1 ? "e" : ""} aus dem Gespräch
        </p>
      </header>

      {signals.map((signal, i) => (
        <div
          key={`${signal.signal}-${i}`}
          className="space-y-4 rounded-xl border border-cross-border bg-cross-muted p-5"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-cross">Signal</p>
            <p className="mt-1 text-base font-medium text-ink">{signal.signal}</p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-cross">Chance</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">{signal.chance}</p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-cross">Produkte</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {signal.produkte.map((p) => (
                <li
                  key={p}
                  className="rounded-full border border-cross-border bg-canvas-raised/50 px-3 py-1 text-sm text-ink"
                >
                  {p}
                </li>
              ))}
            </ul>
          </div>

          {signal.belege.length > 0 && (
            <div className="border-t border-cross-border/50 pt-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                Beleg im Transkript
              </p>
              <BelegChips belege={signal.belege} meetings={meetings} />
            </div>
          )}
        </div>
      ))}
    </article>
  );
}
