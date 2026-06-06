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
    ? `${formatSec(beleg.start_sec)} · ${speaker}`
    : formatSec(beleg.start_sec);

  return (
    <button
      type="button"
      onClick={() => onJump(beleg.meeting_id, beleg.start_sec)}
      className="chip-beleg gap-1"
      title={`Zur Stelle in ${beleg.meeting_id} bei ${formatSec(beleg.start_sec)} springen`}
    >
      <span>{label}</span>
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="opacity-70" aria-hidden>
        <path
          d="M2 5h6M6 2l3 3-3 3"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
