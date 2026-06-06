export type {
  Segment as TranscriptSegment,
  Meeting,
  Transcript,
  Beleg,
  ProtokollFeld,
  ComplianceGap,
  CrossSell as CrossSellSignal,
  PlanStep,
  Action as DemoAction,
  Analysis as AnalyseResult,
  QaResponse as QaResult,
  Pflichtfeld,
} from "@aibeavers/shared";

export {
  PFLICHTFELDER,
  PFLICHTFELD_LABELS,
  TERMINOLOGIE,
} from "@aibeavers/shared";

export type Protokoll = Record<
  string,
  import("@aibeavers/shared").ProtokollFeld
>;

export type KalenderAction = Extract<
  import("@aibeavers/shared").Action,
  { typ: "kalender" }
>;

export type CrmTaskAction = Extract<
  import("@aibeavers/shared").Action,
  { typ: "crm_task" }
>;

export type EmailEntwurfAction = Extract<
  import("@aibeavers/shared").Action,
  { typ: "email_entwurf" }
>;

export interface CrmExecutionInfo {
  status: "success" | "mocked" | "error";
  externalId?: string;
  provider?: string;
}
