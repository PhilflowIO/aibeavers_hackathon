"use client";

import type { CrossSellSignal, Meeting } from "../../lib/types";
import { BelegChips } from "../grounding/BelegChips";

interface CrossSellPanelProps {
  signals: CrossSellSignal[];
  meetings?: Meeting[];
}

export function CrossSellPanel({ signals, meetings }: CrossSellPanelProps) {
  const signal = signals[0];

  if (!signal) {
    return (
      <article className="flex h-full items-center justify-center text-sm text-zinc-500">
        Keine Verkaufschancen erkannt.
      </article>
    );
  }

  return (
    <article className="flex h-full flex-col">
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-zinc-50">Verkaufschance</h2>
        <p className="mt-1 text-sm text-zinc-500">Beiläufiges Signal aus dem Gespräch</p>
      </header>

      <div className="space-y-4 rounded-xl border border-violet-500/30 bg-violet-500/5 p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-400">Signal</p>
          <p className="mt-1 text-base font-medium text-zinc-100">{signal.signal}</p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-400">Chance</p>
          <p className="mt-1 text-sm text-zinc-300">{signal.chance}</p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-400">
            Produkte
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {signal.produkte.map((p) => (
              <li
                key={p}
                className="rounded-full border border-violet-500/40 bg-violet-500/10 px-3 py-1 text-sm text-violet-200"
              >
                {p}
              </li>
            ))}
          </ul>
        </div>

        {signal.belege.length > 0 && (
          <div className="pt-1">
            <BelegChips belege={signal.belege} meetings={meetings} />
          </div>
        )}
      </div>
    </article>
  );
}
