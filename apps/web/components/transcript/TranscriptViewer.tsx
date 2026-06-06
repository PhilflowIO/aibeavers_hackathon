"use client";

import { useBelegJump } from "../grounding/BelegJumpController";
import type { Meeting } from "../../lib/types";
import { TranscriptSegment } from "./TranscriptSegment";

interface TranscriptViewerProps {
  meetings: Meeting[];
}

export function TranscriptViewer({ meetings }: TranscriptViewerProps) {
  const { activeMeetingId, highlightSec } = useBelegJump();
  const meeting = meetings.find((m) => m.meeting_id === activeMeetingId);

  if (!meeting) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4 text-sm text-zinc-500">
        Kein Transkript für diesen Termin.
      </div>
    );
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-2">
      <header className="shrink-0 px-1">
        <h3 className="text-sm font-medium text-zinc-200">{meeting.titel}</h3>
        <p className="text-xs text-zinc-500">{meeting.datum}</p>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950/30 p-2">
        <div className="flex flex-col gap-2">
          {meeting.segments.map((segment, index) => {
            const highlighted =
              highlightSec !== null &&
              highlightSec >= segment.start_sec &&
              highlightSec < segment.end_sec;

            return (
              <TranscriptSegment
                key={`${meeting.meeting_id}-${index}`}
                meeting_id={meeting.meeting_id}
                index={index}
                segment={segment}
                highlighted={highlighted}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
