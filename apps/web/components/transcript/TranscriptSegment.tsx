"use client";

import { useEffect } from "react";

import { formatSec } from "../../lib/beleg-jump";
import type { TranscriptSegment as TranscriptSegmentData } from "../../lib/types";
import { useBelegJump } from "../grounding/BelegJumpController";

interface TranscriptSegmentProps {
  meeting_id: string;
  index: number;
  segment: TranscriptSegmentData;
  highlighted?: boolean;
}

export function TranscriptSegment({
  meeting_id,
  index,
  segment,
  highlighted = false,
}: TranscriptSegmentProps) {
  const { registerSegmentRef } = useBelegJump();

  useEffect(() => {
    return () => registerSegmentRef(meeting_id, index, null);
  }, [meeting_id, index, registerSegmentRef]);

  const speakerClass =
    segment.speaker === "Berater"
      ? "text-speaker-advisor"
      : segment.speaker === "Kunde"
        ? "text-speaker-client"
        : "text-ink-muted";

  return (
    <article
      id={`segment-${meeting_id}-${index}`}
      ref={(node) => registerSegmentRef(meeting_id, index, node)}
      className={[
        "segment-card scroll-mt-4",
        highlighted ? "segment-card--active animate-segment-flash" : "",
      ].join(" ")}
    >
      <header className="mb-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs">
        <span className={`font-semibold ${speakerClass}`}>{segment.speaker}</span>
        <time className="font-mono text-ink-faint" dateTime={`PT${segment.start_sec}S`}>
          {formatSec(segment.start_sec)}–{formatSec(segment.end_sec)}
        </time>
      </header>
      <p className="text-sm leading-relaxed text-ink">{segment.text}</p>
    </article>
  );
}
