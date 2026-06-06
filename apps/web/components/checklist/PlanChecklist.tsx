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
  const doneCount = steps.filter((s) => s.status === "done" || s.status === "warn").length;
  const progress = steps.length > 0 ? Math.round((doneCount / steps.length) * 100) : 0;

  return (
    <section className="flex h-full flex-col">
      <header className="mb-5 border-b border-border-subtle pb-4">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
            {title}
          </h2>
          {steps.length > 0 && (
            <span className="font-mono text-[11px] text-ink-faint" aria-hidden>
              {progress}%
            </span>
          )}
        </div>

        {steps.length > 0 && (
          <div
            className="checklist-progress mt-3"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Fortschritt Nacharbeits-Plan"
          >
            <div className="checklist-progress__fill" style={{ width: `${progress}%` }} />
          </div>
        )}

        <p className="mt-3 text-sm text-ink-muted">
          {steps.length === 0
            ? "Wartet auf Analyse…"
            : isRevealing
              ? "Plan wird aufgebaut…"
              : `${doneCount} von ${steps.length} Schritten`}
        </p>
      </header>

      <ul className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
        {steps.length === 0 ? (
          <li className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm leading-relaxed text-ink-faint">
            Klicken Sie auf „Nacharbeit starten"
          </li>
        ) : (
          steps.map((step, i) => (
            <PlanStepItem
              key={`${step.schritt}-${i}`}
              step={step}
              index={i}
              animate={isRevealing}
              isLatest={i === steps.length - 1 && isRevealing}
            />
          ))
        )}
      </ul>
    </section>
  );
}
