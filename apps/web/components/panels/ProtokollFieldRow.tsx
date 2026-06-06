"use client";

import type { Meeting, ProtokollFeld } from "../../lib/types";
import { BelegChips } from "../grounding/BelegChips";

interface ProtokollFieldRowProps {
  label: string;
  field: ProtokollFeld | undefined;
  meetings?: Meeting[];
}

export function ProtokollFieldRow({ label, field, meetings }: ProtokollFieldRowProps) {
  const missing = !field?.wert;
  const wert = field?.wert ?? "— fehlt —";

  return (
    <div
      className={`grid grid-cols-[minmax(140px,28%)_1fr] gap-3 border-b border-zinc-800 py-3 last:border-0 ${
        missing ? "bg-amber-50" : ""
      }`}
    >
      <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="space-y-2">
        <p
          className={`text-sm leading-relaxed ${
            missing ? "font-medium text-amber-800" : "text-zinc-200"
          }`}
        >
          {wert}
        </p>
        {field?.belege && field.belege.length > 0 && (
          <BelegChips belege={field.belege} meetings={meetings} />
        )}
      </dd>
    </div>
  );
}
