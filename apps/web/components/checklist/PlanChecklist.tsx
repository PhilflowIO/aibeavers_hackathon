"use client";

import type { PlanStep } from "../../lib/types";
import { PlanStepItem } from "./PlanStepItem";

interface PlanChecklistProps {
  steps: PlanStep[];
  isRevealing?: boolean;
  title?: string;
}

export function PlanChecklist({
  steps,
  isRevealing = false,
  title = "Nacharbeits-Plan",
}: PlanChecklistProps) {
  return (
    <section className="flex h-full flex-col">
      <header className="mb-4 border-b border-zinc-700/60 pb-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          {title}
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          {steps.length === 0
            ? "Wartet auf Analyse…"
            : isRevealing
              ? "Plan wird aufgebaut…"
              : `${steps.length} Schritte abgearbeitet`}
        </p>
      </header>

      <ul className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
        {steps.length === 0 ? (
          <li className="rounded-lg border border-dashed border-zinc-700 px-3 py-6 text-center text-sm text-zinc-500">
            Klicken Sie auf „Nacharbeit starten"
          </li>
        ) : (
          steps.map((step, i) => (
            <PlanStepItem
              key={`${step.schritt}-${i}`}
              step={step}
              index={i}
              animate={isRevealing}
            />
          ))
        )}
      </ul>
    </section>
  );
}
