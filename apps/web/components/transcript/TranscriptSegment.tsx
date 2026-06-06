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
      ? "text-emerald-700"
      : segment.speaker === "Kunde"
        ? "text-violet-700"
        : "text-zinc-300";

  return (
    <article
      id={`segment-${meeting_id}-${index}`}
      ref={(node) => registerSegmentRef(meeting_id, index, node)}
      className={[
        "border-b px-1 py-2.5 transition-colors duration-300 last:border-0",
        highlighted
          ? "rounded-md border-sky-300 bg-sky-50 px-3 ring-2 ring-sky-200 animate-pulse"
          : "border-zinc-800 hover:bg-zinc-900/70",
      ].join(" ")}
    >
      <header className="mb-1 flex items-baseline gap-2 text-xs">
        <span className={`font-semibold ${speakerClass}`}>{segment.speaker}</span>
        <time
          className="font-mono text-zinc-500"
          dateTime={`PT${segment.start_sec}S`}
        >
          {formatSec(segment.start_sec)}–{formatSec(segment.end_sec)}
        </time>
      </header>
      <p className="text-sm leading-relaxed text-zinc-200">{segment.text}</p>
    </article>
  );
}
