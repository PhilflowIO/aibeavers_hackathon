"use client";

import {
  PFLICHTFELDER,
  PFLICHTFELD_LABELS,
  type Meeting,
  type Protokoll,
} from "../../lib/types";
import { ProtokollFieldRow } from "./ProtokollFieldRow";

interface ProtokollPanelProps {
  protokoll: Protokoll;
  meetings?: Meeting[];
}

export function ProtokollPanel({ protokoll, meetings }: ProtokollPanelProps) {
  return (
    <article className="flex h-full flex-col">
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-zinc-50">Beratungsprotokoll</h2>
        <p className="mt-1 text-sm text-zinc-500">
          10 Pflichtfelder · jede Zeile mit Quellenbeleg
        </p>
      </header>

      <dl className="flex-1 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900/40 px-4">
        {PFLICHTFELDER.map((key) => (
          <ProtokollFieldRow
            key={key}
            label={PFLICHTFELD_LABELS[key]}
            field={protokoll[key]}
            meetings={meetings}
          />
        ))}
      </dl>
    </article>
  );
}
