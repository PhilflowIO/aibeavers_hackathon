import type { Meeting } from "./types";

export function formatSec(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function findSegmentIndex(
  meetings: Meeting[],
  meeting_id: string,
  start_sec: number,
): number {
  const meeting = meetings.find((m) => m.meeting_id === meeting_id);
  if (!meeting) return -1;

  const exact = meeting.segments.findIndex((seg) => seg.start_sec === start_sec);
  if (exact >= 0) return exact;

  return meeting.segments.findIndex(
    (seg) => start_sec >= seg.start_sec && start_sec < seg.end_sec,
  );
}

export function getSpeakerAtBeleg(
  meetings: Meeting[],
  meeting_id: string,
  start_sec: number,
): string | null {
  const index = findSegmentIndex(meetings, meeting_id, start_sec);
  if (index < 0) return null;
  const meeting = meetings.find((m) => m.meeting_id === meeting_id);
  return meeting?.segments[index]?.speaker ?? null;
}
