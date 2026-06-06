"use client";

import type { PlanStep } from "../../lib/types";

interface PlanStepItemProps {
  step: PlanStep;
  index: number;
  animate?: boolean;
  isLatest?: boolean;
}

export function PlanStepItem({
  step,
  index,
  animate = false,
  isLatest = false,
}: PlanStepItemProps) {
  const status = step.status;

  return (
    <li
      className={`flex items-start gap-3 rounded-lg border px-3.5 py-3 transition-colors duration-200 ${
        animate ? "animate-checklist-reveal" : ""
      } ${isLatest ? "ring-1 ring-brass-glow" : ""} ${statusStyles(status)}`}
      style={animate ? { animationDelay: `${index * 120}ms` } : undefined}
    >
      <StatusIcon status={status} />
      <span className="text-sm leading-snug text-ink">{step.schritt}</span>
    </li>
  );
}

function StatusIcon({ status }: { status: PlanStep["status"] | "pending" }) {
  if (status === "done") {
    return (
      <span
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sage-muted text-sage"
        aria-label="Erledigt"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
          <path
            d="M2.5 6l2.5 2.5 4.5-5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }
  if (status === "warn") {
    return (
      <span
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-warn-muted text-xs font-bold text-warn"
        aria-label="Warnung"
      >
        !
      </span>
    );
  }
  return (
    <span
      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border"
      aria-label="Ausstehend"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-ink-faint" />
    </span>
  );
}

function statusStyles(status: PlanStep["status"] | "pending"): string {
  switch (status) {
    case "done":
      return "border-sage/25 bg-sage-muted/50";
    case "warn":
      return "border-warn/30 bg-warn-muted";
    default:
      return "border-border-subtle bg-canvas-raised/60";
  }
}
