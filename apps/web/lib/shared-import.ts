/**
 * Re-export shared types when @aibeavers/shared is available.
 * Falls back to local types.ts contract.
 */
export type {
  AnalyseResult,
  Beleg,
  ComplianceGap,
  CrossSellSignal,
  DemoAction,
  PlanStep,
  Protokoll,
  ProtokollFeld,
  QaResult,
} from "./types";
