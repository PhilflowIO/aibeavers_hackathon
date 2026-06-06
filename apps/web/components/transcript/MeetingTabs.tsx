"use client";

import { useBelegJump } from "../grounding/BelegJumpController";
import type { Meeting } from "../../lib/types";

interface MeetingTabsProps {
  meetings: Meeting[];
}

export function MeetingTabs({ meetings }: MeetingTabsProps) {
  const { activeMeetingId, setActiveMeetingId } = useBelegJump();

  if (meetings.length <= 1) {
    return null;
  }

  return (
    <div
      role="tablist"
      aria-label="Beratungstermine"
      className="max-w-full overflow-x-auto rounded-lg border border-border-subtle bg-canvas-raised/60 p-1"
    >
      <div className="flex min-w-min gap-1">
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
                "min-h-[44px] min-w-[120px] rounded-md px-3 py-2 text-left text-sm transition duration-200",
                active ? "mode-toggle--active bg-brass-muted" : "mode-toggle--idle",
              ].join(" ")}
            >
              <span className="block font-medium">{meeting.meeting_id}</span>
              <span className="block max-w-[180px] truncate text-xs opacity-80">{meeting.titel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
