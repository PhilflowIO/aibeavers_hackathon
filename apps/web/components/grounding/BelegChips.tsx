"use client";

import { getSpeakerAtBeleg } from "../../lib/beleg-jump";
import type { Beleg, Meeting } from "../../lib/types";
import { useBelegJumpOptional } from "./BelegJumpController";
import { QuoteChip } from "./QuoteChip";

interface BelegChipsProps {
  belege: Beleg[];
  meetings?: Meeting[];
}

export function BelegChips({ belege, meetings = [] }: BelegChipsProps) {
  const jump = useBelegJumpOptional();

  if (belege.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {belege.map((beleg, i) => (
        <QuoteChip
          key={`${beleg.meeting_id}-${beleg.start_sec}-${i}`}
          beleg={beleg}
          speaker={getSpeakerAtBeleg(meetings, beleg.meeting_id, beleg.start_sec)}
          onJump={jump?.jumpTo ?? noopJump}
        />
      ))}
    </div>
  );
}

function noopJump() {
  /* transcript viewer not mounted yet */
}
