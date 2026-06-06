"use client";

import type { PlanStep } from "../../lib/types";

interface PlanStepItemProps {
  step: PlanStep;
  index: number;
  animate?: boolean;
}

export function PlanStepItem({ step, index, animate = false }: PlanStepItemProps) {
  const status = step.status;

  return (
    <li
      className={`flex items-start gap-3 border-b px-1 py-3 transition-all last:border-0 ${
        animate ? "animate-checklist-reveal" : ""
      } ${statusStyles(status)}`}
      style={animate ? { animationDelay: `${index * 120}ms` } : undefined}
    >
      <StatusIcon status={status} />
      <span className="text-sm leading-snug text-zinc-100">{step.schritt}</span>
    </li>
  );
}

function StatusIcon({ status }: { status: PlanStep["status"] | "pending" }) {
  if (status === "done") {
    return (
      <span
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600"
        aria-label="Erledigt"
      >
        ✓
      </span>
    );
  }
  if (status === "warn") {
    return (
      <span
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-700"
        aria-label="Warnung"
      >
        !
      </span>
    );
  }
  return (
    <span
      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-zinc-600 text-zinc-500"
      aria-label="Ausstehend"
    >
      ○
    </span>
  );
}

function statusStyles(status: PlanStep["status"] | "pending"): string {
  switch (status) {
    case "done":
      return "border-zinc-800 bg-transparent";
    case "warn":
      return "border-amber-200 bg-amber-50/60";
    default:
      return "border-zinc-800 bg-transparent";
  }
}
