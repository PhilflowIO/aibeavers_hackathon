"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { findSegmentIndex } from "../../lib/beleg-jump";
import type { Meeting } from "../../lib/types";

interface JumpTarget {
  meeting_id: string;
  start_sec: number;
  segmentIndex: number;
}

interface BelegJumpContextValue {
  activeMeetingId: string;
  setActiveMeetingId: (meetingId: string) => void;
  highlightSec: number | null;
  jumpTo: (meeting_id: string, start_sec: number) => void;
  registerSegmentRef: (
    meeting_id: string,
    index: number,
    node: HTMLElement | null,
  ) => void;
}

const BelegJumpContext = createContext<BelegJumpContextValue | null>(null);

interface BelegJumpControllerProps {
  meetings: Meeting[];
  defaultMeetingId?: string;
  children: ReactNode;
}

export function BelegJumpController({
  meetings,
  defaultMeetingId,
  children,
}: BelegJumpControllerProps) {
  const [activeMeetingId, setActiveMeetingId] = useState(
    defaultMeetingId ?? meetings[0]?.meeting_id ?? "",
  );
  const [highlightSec, setHighlightSec] = useState<number | null>(null);
  const [jumpTarget, setJumpTarget] = useState<JumpTarget | null>(null);
  const segmentRefs = useRef<Map<string, HTMLElement>>(new Map());
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const registerSegmentRef = useCallback(
    (meeting_id: string, index: number, node: HTMLElement | null) => {
      const key = `${meeting_id}:${index}`;
      if (node) {
        segmentRefs.current.set(key, node);
      } else {
        segmentRefs.current.delete(key);
      }
    },
    [],
  );

  const jumpTo = useCallback(
    (meeting_id: string, start_sec: number) => {
      const segmentIndex = findSegmentIndex(meetings, meeting_id, start_sec);
      if (segmentIndex < 0) return;

      if (highlightTimer.current) {
        clearTimeout(highlightTimer.current);
      }

      setActiveMeetingId(meeting_id);
      setHighlightSec(start_sec);
      setJumpTarget({ meeting_id, start_sec, segmentIndex });

      highlightTimer.current = setTimeout(() => {
        setHighlightSec(null);
        highlightTimer.current = null;
      }, 2000);
    },
    [meetings],
  );

  useEffect(() => {
    if (!jumpTarget) return;

    const key = `${jumpTarget.meeting_id}:${jumpTarget.segmentIndex}`;
    const scroll = () => {
      const node = segmentRefs.current.get(key);
      node?.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    requestAnimationFrame(() => {
      scroll();
      setTimeout(scroll, 50);
    });
  }, [jumpTarget, activeMeetingId]);

  useEffect(() => {
    return () => {
      if (highlightTimer.current) {
        clearTimeout(highlightTimer.current);
      }
    };
  }, []);

  const value = useMemo(
    () => ({
      activeMeetingId,
      setActiveMeetingId,
      highlightSec,
      jumpTo,
      registerSegmentRef,
    }),
    [activeMeetingId, highlightSec, jumpTo, registerSegmentRef],
  );

  return (
    <BelegJumpContext.Provider value={value}>{children}</BelegJumpContext.Provider>
  );
}

export function useBelegJump(): BelegJumpContextValue {
  const ctx = useContext(BelegJumpContext);
  if (!ctx) {
    throw new Error("useBelegJump must be used within BelegJumpController");
  }
  return ctx;
}

/** Safe variant for panels that render with or without transcript wiring. */
export function useBelegJumpOptional(): BelegJumpContextValue | null {
  return useContext(BelegJumpContext);
}
