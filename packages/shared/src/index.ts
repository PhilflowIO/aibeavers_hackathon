export {
  segmentSchema,
  meetingSchema,
  transcriptSchema,
  type Segment,
  type Meeting,
  type Transcript,
} from "./schemas/transcript";

export {
  belegSchema,
  protokollFeldSchema,
  complianceGapSchema,
  crossSellSchema,
  planStepSchema,
  crmTaskActionSchema,
  kalenderActionSchema,
  emailEntwurfActionSchema,
  actionSchema,
  analysisSchema,
  type Beleg,
  type ProtokollFeld,
  type ComplianceGap,
  type CrossSell,
  type PlanStep,
  type Action,
  type Analysis,
} from "./schemas/analysis";

export { qaResponseSchema, type QaResponse } from "./schemas/qa";

export {
  PFLICHTFELDER,
  PFLICHTFELD_LABELS,
  TERMINOLOGIE,
  type Pflichtfeld,
} from "./labels";

export { default as analysisBerger1 } from "./mocks/analysis-berger-1.json" with { type: "json" };
export { default as qaSparrate } from "./mocks/qa-sparrate.json" with { type: "json" };
export { default as qaOffenePunkte } from "./mocks/qa-offene-punkte.json" with { type: "json" };
export { default as qaRefusal } from "./mocks/qa-refusal.json" with { type: "json" };
