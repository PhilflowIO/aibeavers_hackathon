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
    heroExecution,
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
    <div className="flex min-h-screen flex-col bg-zinc-950 font-sans text-zinc-100">
      <DemoHeader />

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 px-6 py-3">
        <div className="flex items-center gap-3">
          <PrimaryCTA onStart={startAnalysis} disabled={isAnalyzing || !isIdle} />
          {demoMode === "manual" && !isIdle && state.startsWith("panel_") && (
            <button
              type="button"
              onClick={advancePanel}
              className="rounded-lg border border-zinc-600 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
            >
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
              className="text-sm text-zinc-500 hover:text-zinc-300"
            >
              Zurücksetzen
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-zinc-500">Modus:</span>
          <button
            type="button"
            onClick={() => setDemoMode("auto")}
            className={`rounded px-2 py-1 ${demoMode === "auto" ? "bg-sky-600 text-white" : "text-zinc-400 hover:bg-zinc-800"}`}
          >
            Auto
          </button>
          <button
            type="button"
            onClick={() => setDemoMode("manual")}
            className={`rounded px-2 py-1 ${demoMode === "manual" ? "bg-sky-600 text-white" : "text-zinc-400 hover:bg-zinc-800"}`}
          >
            Manuell
          </button>
        </div>
      </div>

      <div className="px-6 py-2">
        <RoadmapBanner />
      </div>

      <main className="flex flex-1 gap-0 px-6 pb-6">
        {/* Left: 30% checklist */}
        <aside className="w-[30%] min-w-[240px] shrink-0 border-r border-zinc-800 pr-5">
          <PlanChecklist
            steps={visiblePlanSteps}
            isRevealing={isRevealing}
          />
        </aside>

        {/* Right: 70% panels */}
        <section className="relative w-[70%] flex-1 pl-5">
          <AnalyzingOverlay visible={isAnalyzing} />
          <div className="h-full min-h-[480px] rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
            <PanelOrchestrator
              state={state}
              analysis={analysis}
              qaResult={qaResult}
              errorMessage={errorMessage}
              meetings={transcript.meetings}
              crmExecution={crmExecution ?? undefined}
              heroExecution={heroExecution ?? undefined}
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
