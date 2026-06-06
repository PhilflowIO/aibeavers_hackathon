import { z } from "zod";

export const belegSchema = z.object({
  meeting_id: z.string(),
  start_sec: z.number(),
});

export const protokollFeldSchema = z.object({
  wert: z.string().nullable(),
  belege: z.array(belegSchema),
});

export const complianceGapSchema = z.object({
  feld: z.string(),
  fehlt: z.literal(true),
  rechtsgrundlage: z.string(),
  seit: z.string(),
  severity: z.enum(["hoch", "mittel"]),
  empfehlung: z.string(),
});

export const crossSellSchema = z.object({
  signal: z.string(),
  chance: z.string(),
  produkte: z.array(z.string()),
  belege: z.array(belegSchema),
});

export const planStepSchema = z.object({
  schritt: z.string(),
  status: z.enum(["done", "warn"]),
});

export const crmTaskActionSchema = z.object({
  typ: z.literal("crm_task"),
  titel: z.string(),
  faelligkeit: z.string(),
});

export const kalenderActionSchema = z.object({
  typ: z.literal("kalender"),
  titel: z.string(),
  start: z.string().optional(),
  dauer_min: z.number().optional(),
});

export const emailEntwurfActionSchema = z.object({
  typ: z.literal("email_entwurf"),
  betreff: z.string(),
  empfaenger: z.string().optional(),
});

export const actionSchema = z.discriminatedUnion("typ", [
  crmTaskActionSchema,
  kalenderActionSchema,
  emailEntwurfActionSchema,
]);

export const analysisSchema = z.object({
  protokoll: z.record(z.string(), protokollFeldSchema),
  compliance_gaps: z.array(complianceGapSchema),
  cross_sell: z.array(crossSellSchema),
  plan_steps: z.array(planStepSchema),
  actions: z.array(actionSchema),
});

export type Beleg = z.infer<typeof belegSchema>;
export type ProtokollFeld = z.infer<typeof protokollFeldSchema>;
export type ComplianceGap = z.infer<typeof complianceGapSchema>;
export type CrossSell = z.infer<typeof crossSellSchema>;
export type PlanStep = z.infer<typeof planStepSchema>;
export type Action = z.infer<typeof actionSchema>;
export type Analysis = z.infer<typeof analysisSchema>;
