"use client";

import { getSpeakerAtBeleg } from "../../lib/beleg-jump";
import type { Meeting, QaResult } from "../../lib/types";
import { QuoteChip } from "../grounding/QuoteChip";
import { RefusalBadge } from "../grounding/RefusalBadge";
import { useBelegJump } from "../grounding/BelegJumpController";
import { VoicePlayer } from "./VoicePlayer";

interface QaAnswerProps {
  response: QaResult;
  meetings: Meeting[];
}

export function QaAnswer({ response, meetings }: QaAnswerProps) {
  const { jumpTo } = useBelegJump();
  const { antwort, belege, gedeckt } = response;

  return (
    <article
      className={[
        "qa-answer rounded-xl border p-4",
        gedeckt
          ? "border-border-subtle bg-canvas-raised/50"
          : "border-warn/30 bg-warn-muted",
      ].join(" ")}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span
          className={[
            "rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
            gedeckt ? "bg-sage-muted text-sage" : "bg-warn-muted text-warn",
          ].join(" ")}
        >
          {gedeckt ? "Gedeckt" : "Nicht gedeckt"}
        </span>
        {!gedeckt && <RefusalBadge />}
      </div>

      <p className="mb-4 text-sm leading-relaxed text-ink">{antwort}</p>

      {gedeckt && belege.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
            Quellen
          </p>
          <div className="flex flex-wrap gap-1.5">
            {belege.map((beleg) => (
              <QuoteChip
                key={`${beleg.meeting_id}-${beleg.start_sec}`}
                beleg={beleg}
                speaker={getSpeakerAtBeleg(meetings, beleg.meeting_id, beleg.start_sec)}
                onJump={jumpTo}
              />
            ))}
          </div>
        </div>
      )}

      {gedeckt && <VoicePlayer text={antwort} />}
    </article>
  );
}
