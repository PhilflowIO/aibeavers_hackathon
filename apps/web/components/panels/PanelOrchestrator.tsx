"use client";

import type { DemoState } from "../../lib/demo-state";
import type {
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
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-500">
        Keine Analysedaten geladen.
      </div>
    );
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
          <KalenderPanel actions={analysis.actions} />
          <UnterlagenPanel actions={analysis.actions} />
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
    <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-900/30 p-8 text-center">
      {state !== "idle" && (
        <span className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-sky-500/30 border-t-sky-400" />
      )}
      <p className="max-w-sm text-sm text-zinc-400">{messages[state] ?? ""}</p>
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
    <article className="flex h-full flex-col gap-4">
      <header>
        <h2 className="text-lg font-semibold text-zinc-50">Talk to your calls</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Cross-Call Q&A mit Quellenbelegen und Voice
        </p>
      </header>

      {(state === "qa_ready" || state === "qa_loading") && (
        <QaInput onAsk={onRunQa} loading={isLoading} />
      )}

      {isLoading && (
        <div className="flex items-center gap-3 text-sm text-zinc-400">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-violet-500/30 border-t-violet-400" />
          Antwort wird generiert…
        </div>
      )}

      {qaResult && !isLoading && (
        <QaAnswer response={qaResult} meetings={meetings} />
      )}

      {state === "complete" && (
        <p className="text-xs text-emerald-500/90">
          ✓ Demo abgeschlossen — Agent hat Nacharbeit ausgeführt und beantwortet.
        </p>
      )}
    </article>
  );
}
