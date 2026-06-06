import { readFile } from "node:fs/promises";
import path from "node:path";
import { transcriptSchema, type Transcript } from "@aibeavers/shared";

/** Load demo-transcript.json from repo root (apps/web cwd in dev). */
export async function loadDefaultTranscript(): Promise<Transcript> {
  const candidates = [
    path.join(process.cwd(), "public/demo-transcript.json"),
    path.join(process.cwd(), "../../demo-transcript.json"),
  ];

  for (const filePath of candidates) {
    try {
      const raw = await readFile(filePath, "utf-8");
      return transcriptSchema.parse(JSON.parse(raw));
    } catch {
      // try next candidate
    }
  }

  throw new Error("demo-transcript.json nicht gefunden");
}

/** Flatten meetings to segment rows for the analyse prompt. */
export function flattenTranscriptForLlm(transcript: Transcript): unknown[] {
  return transcript.meetings.flatMap((meeting) =>
    meeting.segments.map((seg) => ({
      meeting_id: meeting.meeting_id,
      speaker: seg.speaker,
      start_sec: seg.start_sec,
      end_sec: seg.end_sec,
      text: seg.text,
    }))
  );
}
