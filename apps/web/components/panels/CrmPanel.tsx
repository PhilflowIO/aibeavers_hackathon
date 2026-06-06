"use client";

import type { CrmExecutionInfo, CrmTaskAction, DemoAction } from "../../lib/types";

interface CrmPanelProps {
  actions: DemoAction[];
  execution?: CrmExecutionInfo;
}

export function CrmPanel({ actions, execution }: CrmPanelProps) {
  const crmAction = actions.find((a): a is CrmTaskAction => a.typ === "crm_task");

  if (!crmAction) {
    return <article className="empty-state">Kein CRM-Eintrag in den Aktionen.</article>;
  }

  const status = execution?.status ?? "pending";
  const isPending = status === "pending";
  const isError = status === "error";
  const liveBadge =
    execution?.status === "success" && execution.provider && execution.provider !== "mock";
  const isMocked = status === "mocked" || (status === "success" && !liveBadge);
  const panelTone = isError
    ? "border-danger-border bg-danger-muted"
    : isPending || isMocked
      ? "border-border-subtle bg-canvas-raised/60"
      : "border-sage/30 bg-sage-muted";
  const iconTone = isError
    ? "bg-danger-muted text-danger"
    : isPending || isMocked
      ? "bg-canvas-surface text-ink-muted"
      : "bg-sage-muted text-sage";
  const labelTone = isError
    ? "text-danger"
    : isPending || isMocked
      ? "text-ink-muted"
      : "text-sage";
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
      <header className="panel-heading">
        <h2 className="panel-heading-title">{heading}</h2>
        <p className="panel-heading-sub">{helper}</p>
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
            <span className="rounded-full bg-sage-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sage">
              Live · {execution.provider}
              {execution.externalId ? ` #${execution.externalId}` : ""}
            </span>
          )}
          {execution?.status === "mocked" && (
            <span className="rounded-full bg-canvas-surface px-2 py-0.5 text-[10px] text-ink-faint">
              Mock-Panel
            </span>
          )}
        </div>

        <h3 className="mt-3 text-base font-semibold text-ink">{crmAction.titel}</h3>

        <dl className="mt-4 grid gap-2 text-sm">
          <div className="flex justify-between border-b border-border-subtle py-2">
            <dt className="text-ink-faint">Fälligkeit</dt>
            <dd className="font-medium text-ink-muted">{crmAction.faelligkeit}</dd>
          </div>
          <div className="flex justify-between border-b border-border-subtle py-2">
            <dt className="text-ink-faint">Kunde</dt>
            <dd className="font-medium text-ink-muted">Thomas Berger</dd>
          </div>
          <div className="flex justify-between py-2">
            <dt className="text-ink-faint">Status</dt>
            <dd className={`font-medium ${isError ? "text-danger" : liveBadge ? "text-sage" : "text-ink-muted"}`}>
              {statusText}
            </dd>
          </div>
        </dl>
      </div>
    </article>
  );
}
