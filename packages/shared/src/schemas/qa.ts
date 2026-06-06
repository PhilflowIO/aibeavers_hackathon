import { z } from "zod";
import { belegSchema } from "./analysis";

export const qaResponseSchema = z.object({
  antwort: z.string(),
  belege: z.array(belegSchema),
  gedeckt: z.boolean(),
});

export type QaResponse = z.infer<typeof qaResponseSchema>;
