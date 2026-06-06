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
      className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 transition-all ${
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
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400"
        aria-label="Erledigt"
      >
        ✓
      </span>
    );
  }
  if (status === "warn") {
    return (
      <span
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-400"
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
      return "border-emerald-500/20 bg-emerald-500/5";
    case "warn":
      return "border-amber-500/30 bg-amber-500/5";
    default:
      return "border-zinc-700/60 bg-zinc-800/40";
  }
}
