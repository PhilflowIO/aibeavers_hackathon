"use client";

import { formatSec } from "../../lib/beleg-jump";
import type { Beleg } from "../../lib/types";

interface QuoteChipProps {
  beleg: Beleg;
  speaker: string | null;
  onJump: (meeting_id: string, start_sec: number) => void;
}

export function QuoteChip({ beleg, speaker, onJump }: QuoteChipProps) {
  const label = speaker
    ? `${formatSec(beleg.start_sec)} ${speaker}`
    : formatSec(beleg.start_sec);

  return (
    <button
      type="button"
      onClick={() => onJump(beleg.meeting_id, beleg.start_sec)}
      className="inline-flex items-center rounded-full border border-sky-500/40 bg-sky-500/10 px-2.5 py-0.5 text-xs font-medium text-sky-300 transition hover:border-sky-400 hover:bg-sky-500/20 hover:text-sky-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
      title={`Zur Stelle in ${beleg.meeting_id} springen`}
    >
      {label}
    </button>
  );
}
