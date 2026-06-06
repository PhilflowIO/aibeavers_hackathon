import type { Action } from "@aibeavers/shared";
import type { ActionResult } from "../execute-helpers";

export type CrmTaskAction = Extract<Action, { typ: "crm_task" }>;

export interface CrmContext {
  kunde: string;
  kundeEmail?: string;
}

export type CrmExecutionResult = ActionResult & { typ: "crm_task" };

export interface CrmProvider {
  readonly name: string;
  createTask(
    action: CrmTaskAction,
    ctx: CrmContext,
  ): Promise<CrmExecutionResult>;
}
