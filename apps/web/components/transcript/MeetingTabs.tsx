"use client";

import { useBelegJump } from "../grounding/BelegJumpController";
import type { Meeting } from "../../lib/types";

interface MeetingTabsProps {
  meetings: Meeting[];
}

export function MeetingTabs({ meetings }: MeetingTabsProps) {
  const { activeMeetingId, setActiveMeetingId } = useBelegJump();

  return (
    <div
      role="tablist"
      aria-label="Beratungstermine"
      className="flex gap-1 rounded-lg border border-zinc-700/80 bg-zinc-900/60 p-1"
    >
      {meetings.map((meeting) => {
        const active = meeting.meeting_id === activeMeetingId;
        return (
          <button
            key={meeting.meeting_id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setActiveMeetingId(meeting.meeting_id)}
            className={[
              "flex-1 rounded-md px-3 py-2 text-left text-sm transition",
              active
                ? "bg-zinc-700 text-zinc-50 shadow-sm"
                : "text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200",
            ].join(" ")}
          >
            <span className="block font-medium">{meeting.meeting_id}</span>
            <span className="block truncate text-xs opacity-75">{meeting.titel}</span>
          </button>
        );
      })}
    </div>
  );
}
