import { z } from "zod";

export const segmentSchema = z.object({
  speaker: z.string(),
  start_sec: z.number(),
  end_sec: z.number(),
  text: z.string(),
});

export const meetingSchema = z
  .object({
    meeting_id: z.string(),
    titel: z.string(),
    datum: z.string(),
    segments: z.array(segmentSchema),
  })
  .passthrough();

export const transcriptSchema = z
  .object({
    kunde: z.string(),
    meetings: z.array(meetingSchema),
  })
  .passthrough();

export type Segment = z.infer<typeof segmentSchema>;
export type Meeting = z.infer<typeof meetingSchema>;
export type Transcript = z.infer<typeof transcriptSchema>;
