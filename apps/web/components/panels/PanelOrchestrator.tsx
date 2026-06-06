"use client";

import type { DemoState } from "../../lib/demo-state";
import type {
  ActionExecutionInfo,
  AnalyseResult,
  CrmExecutionInfo,
  Meeting,
  QaResult,
} from "../../lib/types";
import { QaAnswer } from "../qa/QaAnswer";
import { QaPanel as QaInput } from "../qa/QaPanel";
import { ErrorPanel } from "../shell/ErrorPanel";
import { AntragPanel } from "./AntragPanel";
import { ComplianceGapPanel } from "./ComplianceGapPanel";
import { CrmPanel } from "./CrmPanel";
import { CrossSellPanel } from "./CrossSellPanel";
import { KalenderPanel } from "./KalenderPanel";
import { ProtokollPanel } from "./ProtokollPanel";
import { UnterlagenPanel } from "./UnterlagenPanel";

interface PanelOrchestratorProps {
  state: DemoState;
  analysis: AnalyseResult | null;
  qaResult: QaResult | null;
  errorMessage: string | null;
  meetings?: Meeting[];
  crmExecution?: CrmExecutionInfo;
  heroExecution?: ActionExecutionInfo;
  onRunQa: (frage: string) => void;
  onRetry?: () => void;
}

export function PanelOrchestrator({
  state,
  analysis,
  qaResult,
  errorMessage,
  meetings = [],
  crmExecution,
  heroExecution,
  onRunQa,
  onRetry,
}: PanelOrchestratorProps) {
  if (state === "idle" || state === "analyzing" || state === "plan_revealing") {
    return <IdlePanel state={state} />;
  }

  if (state === "error" && errorMessage) {
    return <ErrorPanel message={errorMessage} onRetry={onRetry} />;
  }

  if (!analysis) {
    return <div className="empty-state">Keine Analysedaten geladen.</div>;
  }

  switch (state) {
    case "panel_protokoll":
      return <ProtokollPanel protokoll={analysis.protokoll} meetings={meetings} />;

    case "panel_compliance":
      return <ComplianceGapPanel gaps={analysis.compliance_gaps} />;

    case "panel_cross_sell":
      return <CrossSellPanel signals={analysis.cross_sell} meetings={meetings} />;

    case "panel_crm":
      return (
        <CrmPanel actions={analysis.actions} execution={crmExecution} />
      );

    case "panel_antrag":
      return <AntragPanel />;

    case "panel_kalender":
      return (
        <div className="grid h-full gap-4 lg:grid-cols-2">
          <KalenderPanel actions={analysis.actions} execution={heroExecution} />
          <UnterlagenPanel actions={analysis.actions} execution={heroExecution} />
        </div>
      );

    case "qa_ready":
    case "qa_loading":
    case "qa_answered":
    case "complete":
      return (
        <DemoQaSection
          state={state}
          qaResult={qaResult}
          meetings={meetings}
          onRunQa={onRunQa}
          isLoading={state === "qa_loading"}
        />
      );

    default:
      return null;
  }
}

function IdlePanel({ state }: { state: DemoState }) {
  const messages: Record<string, string> = {
    idle: "Bereit — starten Sie die Nacharbeit für Thomas Berger.",
    analyzing: "Analyse läuft…",
    plan_revealing: "Nacharbeits-Plan wird aufgebaut…",
  };

  return (
    <div className="idle-hero flex h-full flex-col items-center justify-center text-center">
      {state !== "idle" && (
        <span className="relative z-10 mb-5 h-9 w-9 animate-spin rounded-full border-2 border-brass/25 border-t-brass" />
      )}
      {state === "idle" && (
        <span
          className="relative z-10 mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-brass-glow bg-brass-muted text-brass"
          aria-hidden
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path
              d="M6 3h7l4 4v12H6V3z"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinejoin="round"
            />
            <path d="M13 3v4h4M8 11h6M8 14.5h4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
          </svg>
        </span>
      )}
      <p className="relative z-10 max-w-sm font-display text-base text-ink-muted">
        {messages[state] ?? ""}
      </p>
      {state === "idle" && (
        <p className="relative z-10 mt-2 text-xs text-ink-faint">
          Plan-Checkliste links · Panels erscheinen nacheinander
        </p>
      )}
    </div>
  );
}

function DemoQaSection({
  state,
  qaResult,
  meetings,
  onRunQa,
  isLoading,
}: {
  state: DemoState;
  qaResult: QaResult | null;
  meetings: Meeting[];
  onRunQa: (frage: string) => void;
  isLoading: boolean;
}) {
  return (
    <article className="flex h-full flex-col gap-4 overflow-y-auto">
      <header className="panel-heading">
        <h2 className="panel-heading-title">Fragen ans Gesprächsarchiv</h2>
        <p className="panel-heading-sub">Cross-Call Q&A mit Quellenbelegen und Voice</p>
      </header>

      {state === "complete" && (
        <div className="rounded-lg border border-sage/30 bg-sage-muted px-4 py-3 text-sm text-sage">
          Demo abgeschlossen — Agent hat Nacharbeit ausgeführt und Fragen beantwortet.
        </div>
      )}

      {(state === "qa_ready" || state === "qa_loading" || state === "complete") && (
        <QaInput onAsk={onRunQa} loading={isLoading} />
      )}

      {isLoading && (
        <div className="qa-skeleton space-y-3 rounded-xl border border-border-subtle bg-canvas-raised/30 p-4">
          <div className="h-3 w-24 animate-pulse rounded bg-border-subtle" />
          <div className="h-4 w-full animate-pulse rounded bg-border-subtle" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-border-subtle" />
          <p className="text-xs text-ink-faint">Antwort wird aus dem Transkript generiert…</p>
        </div>
      )}

      {qaResult && !isLoading && (
        <QaAnswer response={qaResult} meetings={meetings} />
      )}
    </article>
  );
}
