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
      <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border p-6 text-sm text-ink-faint">
        Kein Transkript für diesen Termin.
      </div>
    );
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3">
      <header className="flex shrink-0 flex-wrap items-baseline justify-between gap-2 px-1">
        <div>
          <h3 className="font-display text-base text-ink">{meeting.titel}</h3>
          <p className="text-xs text-ink-faint">{meeting.datum}</p>
        </div>
        <p className="text-[10px] text-ink-faint">
          {meeting.segments.length} Segmente · Klick auf Beleg-Chip springt hierher
        </p>
      </header>
      <div
        id="transcript-scroll"
        className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-border-subtle bg-canvas/40 p-2"
      >
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
