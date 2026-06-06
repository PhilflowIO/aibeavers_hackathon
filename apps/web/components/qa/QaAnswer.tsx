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
        "rounded-lg border p-4",
        gedeckt
          ? "border-zinc-800 bg-zinc-950"
          : "border-amber-300 bg-amber-50",
      ].join(" ")}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span
          className={[
            "rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
            gedeckt
              ? "bg-emerald-500/15 text-emerald-700"
              : "bg-amber-500/15 text-amber-800",
          ].join(" ")}
        >
          {gedeckt ? "Gedeckt" : "Nicht gedeckt"}
        </span>
        {!gedeckt && <RefusalBadge />}
      </div>

      <p className="mb-3 text-sm leading-relaxed text-zinc-100">{antwort}</p>

      {gedeckt && belege.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {belege.map((beleg) => (
            <QuoteChip
              key={`${beleg.meeting_id}-${beleg.start_sec}`}
              beleg={beleg}
              speaker={getSpeakerAtBeleg(
                meetings,
                beleg.meeting_id,
                beleg.start_sec,
              )}
              onJump={jumpTo}
            />
          ))}
        </div>
      )}

      {gedeckt && <VoicePlayer text={antwort} />}
    </article>
  );
}
