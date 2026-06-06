"use client";

import { useState } from "react";
import { PlanChecklist } from "../checklist/PlanChecklist";
import { PanelOrchestrator } from "../panels/PanelOrchestrator";
import { useDemoState } from "../../lib/demo-state";
import type { Transcript } from "../../lib/types";
import { AnalyzingOverlay } from "./AnalyzingOverlay";
import { DemoHeader } from "./DemoHeader";
import { HeroMailToast } from "./HeroMailToast";
import { PrimaryCTA } from "./PrimaryCTA";
import { RoadmapBanner } from "./RoadmapBanner";

interface AppShellProps {
  transcript: Transcript;
}

export function AppShell({ transcript }: AppShellProps) {
  const [mailToastDismissed, setMailToastDismissed] = useState(false);
  const demo = useDemoState("auto", transcript);
  const {
    state,
    demoMode,
    setDemoMode,
    analysis,
    visiblePlanSteps,
    qaResult,
    errorMessage,
    showMailToast,
    crmExecution,
    startAnalysis,
    advancePanel,
    runQa,
    reset,
  } = demo;

  const isAnalyzing = state === "analyzing";
  const isIdle = state === "idle";
  const isRevealing = state === "plan_revealing";
  const showToast = showMailToast && !mailToastDismissed;

  return (
    <div className="demo-grain flex min-h-screen flex-col">
      <DemoHeader
        demoState={state}
        clientName={transcript.kunde}
        meetingId={transcript.meetings[0]?.meeting_id}
        meetingDate={transcript.meetings[0]?.datum}
      />

      <div className="control-bar mx-auto w-full max-w-[1600px] px-6 py-3.5 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <PrimaryCTA onStart={startAnalysis} disabled={isAnalyzing || !isIdle} />
            {demoMode === "manual" && !isIdle && state.startsWith("panel_") && (
              <button type="button" onClick={advancePanel} className="btn-secondary">
                Nächstes Panel →
              </button>
            )}
            {!isIdle && (
              <button
                type="button"
                onClick={() => {
                  setMailToastDismissed(false);
                  reset();
                }}
                className="btn-ghost min-h-[44px] px-1"
              >
                Zurücksetzen
              </button>
            )}
          </div>

          <div
            className="flex items-center gap-1 rounded-lg border border-border-subtle bg-canvas-raised/60 p-1"
            role="group"
            aria-label="Demo-Modus"
          >
            <span className="px-2 text-[11px] font-medium uppercase tracking-wider text-ink-faint">
              Modus
            </span>
            <button
              type="button"
              onClick={() => setDemoMode("auto")}
              className={`mode-toggle ${demoMode === "auto" ? "mode-toggle--active" : "mode-toggle--idle"}`}
            >
              Auto
            </button>
            <button
              type="button"
              onClick={() => setDemoMode("manual")}
              className={`mode-toggle ${demoMode === "manual" ? "mode-toggle--active" : "mode-toggle--idle"}`}
            >
              Manuell
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1600px] px-6 py-3 lg:px-8">
        <RoadmapBanner />
      </div>

      <main className="mx-auto flex w-full max-w-[1600px] flex-1 gap-0 px-6 pb-8 lg:gap-2 lg:px-8">
        <aside className="w-full shrink-0 border-border-subtle pr-0 lg:sticky lg:top-[7.5rem] lg:w-[min(30%,320px)] lg:self-start lg:border-r lg:pr-6 lg:pt-1">
          <PlanChecklist steps={visiblePlanSteps} isRevealing={isRevealing} />
        </aside>

        <section className="relative mt-6 min-h-[480px] flex-1 lg:mt-0 lg:pl-6">
          <AnalyzingOverlay visible={isAnalyzing} />
          <div className="panel-surface h-full p-5 lg:p-6">
            <PanelOrchestrator
              state={state}
              analysis={analysis}
              qaResult={qaResult}
              errorMessage={errorMessage}
              meetings={transcript.meetings}
              crmExecution={crmExecution ?? undefined}
              onRunQa={runQa}
              onRetry={reset}
            />
          </div>
        </section>
      </main>

      <HeroMailToast
        visible={showToast}
        onDismiss={() => setMailToastDismissed(true)}
      />
    </div>
  );
}
