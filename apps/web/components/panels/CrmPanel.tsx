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

  const status = execution?.status ?? "pending";
  const isPending = status === "pending";
  const isError = status === "error";
  const liveBadge =
    execution?.status === "success" && execution.provider && execution.provider !== "mock";
  const isMocked = status === "mocked" || (status === "success" && !liveBadge);
  const panelTone = isError
    ? "border-rose-500/30 bg-rose-500/5"
    : isPending || isMocked
      ? "border-zinc-700 bg-zinc-900/60"
      : "border-emerald-500/30 bg-emerald-500/5";
  const iconTone = isError
    ? "bg-rose-500/20 text-rose-300"
    : isPending || isMocked
      ? "bg-zinc-700/80 text-zinc-300"
      : "bg-emerald-500/20 text-emerald-300";
  const labelTone = isError
    ? "text-rose-300"
    : isPending || isMocked
      ? "text-zinc-300"
      : "text-emerald-400";
  const heading =
    isPending
      ? "CRM — wird angelegt"
      : isError
        ? "CRM — Fehler"
        : isMocked
          ? "CRM — Mock"
          : "CRM — ausgeführt";
  const helper =
    isPending
      ? "Aufgabe wird im CRM vorbereitet"
      : isError
        ? "CRM-Schritt ist fehlgeschlagen, Demo läuft weiter"
        : isMocked
          ? "Sandbox nicht angebunden, Eintrag nur geplant"
          : "Aufgabe wurde angelegt, nicht nur vorgeschlagen";
  const actionLabel = isError
    ? "crm_task fehlgeschlagen"
    : isPending
      ? "crm_task läuft"
      : isMocked
        ? "crm_task geplant"
        : "crm_task erstellt";
  const statusText =
    isPending
      ? "In Arbeit"
      : isError
        ? "Fehler · nicht angelegt"
        : isMocked
          ? "Mock · nicht live angelegt"
          : "Offen · vom Agent angelegt";

  return (
    <article className="flex h-full flex-col">
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-zinc-50">{heading}</h2>
        <p className="mt-1 text-sm text-zinc-500">{helper}</p>
      </header>

      <div className={`rounded-xl border p-5 ${panelTone}`}>
        <div className={`flex flex-wrap items-center gap-2 ${labelTone}`}>
          <span className={`flex h-6 w-6 items-center justify-center rounded-full text-sm ${iconTone}`}>
            {isError ? "!" : liveBadge ? "✓" : "-"}
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider">
            {actionLabel}
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
            <dd className={`font-medium ${isError ? "text-rose-300" : liveBadge ? "text-emerald-400" : "text-zinc-300"}`}>
              {statusText}
            </dd>
          </div>
        </dl>
      </div>
    </article>
  );
}
