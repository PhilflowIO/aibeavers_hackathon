"use client";

import { useState } from "react";

import type { Meeting, ProtokollFeld } from "../../lib/types";
import { BelegChips } from "../grounding/BelegChips";

interface ProtokollFieldRowProps {
  label: string;
  field: ProtokollFeld | undefined;
  meetings?: Meeting[];
}

const CLAMP_CHARS = 140;

export function ProtokollFieldRow({ label, field, meetings }: ProtokollFieldRowProps) {
  const [expanded, setExpanded] = useState(false);
  const missing = !field?.wert;
  const wert = field?.wert ?? "Nicht erfasst";
  const long = !missing && wert.length > CLAMP_CHARS;
  const display = long && !expanded ? `${wert.slice(0, CLAMP_CHARS).trim()}…` : wert;

  return (
    <div
      className={`grid grid-cols-1 gap-2 border-b border-border-subtle py-3.5 last:border-0 sm:grid-cols-[minmax(140px,28%)_1fr] sm:gap-3 ${
        missing ? "field-missing -mx-2 rounded-md px-2" : ""
      }`}
    >
      <dt className="text-xs font-medium uppercase tracking-wide text-ink-faint">{label}</dt>
      <dd className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-start gap-2">
          <p
            className={`min-w-0 flex-1 text-sm leading-relaxed ${
              missing ? "font-medium text-warn" : "text-ink"
            }`}
            title={long && !expanded ? wert : undefined}
          >
            {display}
          </p>
          {missing && (
            <span className="shrink-0 rounded-full border border-warn/30 bg-warn-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warn">
              Lücke
            </span>
          )}
        </div>
        {long && (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="interactive-focus text-xs text-beleg underline-offset-2 hover:underline"
          >
            {expanded ? "Weniger" : "Mehr anzeigen"}
          </button>
        )}
        {field?.belege && field.belege.length > 0 && (
          <BelegChips belege={field.belege} meetings={meetings} />
        )}
      </dd>
    </div>
  );
}
