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
  const filled = PFLICHTFELDER.filter((key) => protokoll[key]?.wert).length;
  const gaps = PFLICHTFELDER.length - filled;

  return (
    <article className="flex h-full flex-col">
      <header className="panel-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="panel-heading-title">Beratungsprotokoll</h2>
            <p className="panel-heading-sub">10 Pflichtfelder · jede Zeile mit Quellenbeleg</p>
          </div>
          <p className="font-mono text-xs text-ink-faint">
            {filled}/10 erfasst
            {gaps > 0 && (
              <span className="ml-2 text-warn">· {gaps} Lücke{gaps > 1 ? "n" : ""}</span>
            )}
          </p>
        </div>
      </header>

      <dl className="flex-1 overflow-y-auto rounded-lg border border-border-subtle bg-canvas-raised/40 px-4">
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
