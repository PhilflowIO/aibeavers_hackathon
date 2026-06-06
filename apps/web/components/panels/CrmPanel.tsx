"use client";

import type { CrmExecutionInfo, CrmTaskAction, DemoAction } from "../../lib/types";

interface CrmPanelProps {
  actions: DemoAction[];
  execution?: CrmExecutionInfo;
}

export function CrmPanel({ actions, execution }: CrmPanelProps) {
  const crmAction = actions.find((a): a is CrmTaskAction => a.typ === "crm_task");

  if (!crmAction) {
    return (
      <article className="flex h-full items-center justify-center text-sm text-zinc-500">
        Kein CRM-Eintrag in den Aktionen.
      </article>
    );
  }

  const liveBadge =
    execution?.status === "success" && execution.provider && execution.provider !== "mock";

  return (
    <article className="flex h-full flex-col">
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-zinc-50">CRM — ausgeführt</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Aufgabe wurde angelegt, nicht nur vorgeschlagen
        </p>
      </header>

      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5">
        <div className="flex flex-wrap items-center gap-2 text-emerald-400">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-sm">
            ✓
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider">
            crm_task erstellt
          </span>
          {liveBadge && (
            <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sky-300">
              Live · {execution.provider}
              {execution.externalId ? ` #${execution.externalId}` : ""}
            </span>
          )}
          {execution?.status === "mocked" && (
            <span className="rounded-full bg-zinc-700/80 px-2 py-0.5 text-[10px] text-zinc-400">
              Mock-Panel
            </span>
          )}
        </div>

        <h3 className="mt-3 text-base font-semibold text-zinc-100">{crmAction.titel}</h3>

        <dl className="mt-4 grid gap-2 text-sm">
          <div className="flex justify-between border-b border-zinc-800 py-2">
            <dt className="text-zinc-500">Fälligkeit</dt>
            <dd className="font-medium text-zinc-200">{crmAction.faelligkeit}</dd>
          </div>
          <div className="flex justify-between border-b border-zinc-800 py-2">
            <dt className="text-zinc-500">Kunde</dt>
            <dd className="font-medium text-zinc-200">Thomas Berger</dd>
          </div>
          <div className="flex justify-between py-2">
            <dt className="text-zinc-500">Status</dt>
            <dd className="font-medium text-emerald-400">Offen · vom Agent angelegt</dd>
          </div>
        </dl>
      </div>
    </article>
  );
}
