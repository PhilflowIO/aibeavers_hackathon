"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  analyzeTranscript,
  askQuestion,
  executeActions,
} from "./api-client";
import { MOCK_QA } from "./mock-demo-data";
import type {
  AnalyseResult,
  CrmExecutionInfo,
  PlanStep,
  QaResult,
  Transcript,
} from "./types";

export type DemoState =
  | "idle"
  | "analyzing"
  | "plan_revealing"
  | "panel_protokoll"
  | "panel_compliance"
  | "panel_cross_sell"
  | "panel_crm"
  | "panel_antrag"
  | "panel_kalender"
  | "qa_ready"
  | "qa_loading"
  | "qa_answered"
  | "complete"
  | "error";

export type DemoMode = "auto" | "manual";

const PANEL_SEQUENCE: DemoState[] = [
  "panel_protokoll",
  "panel_compliance",
  "panel_cross_sell",
  "panel_crm",
  "panel_antrag",
  "panel_kalender",
];

const AUTO_DELAYS_MS: Partial<Record<DemoState, number>> = {
  plan_revealing: 2800,
  panel_protokoll: 1800,
  panel_compliance: 2000,
  panel_cross_sell: 1800,
  panel_crm: 1600,
  panel_antrag: 1600,
  panel_kalender: 2200,
};

const DEMO_QA_QUESTION =
  "Zeig mir alle offenen Punkte von Herrn Berger aus beiden Terminen — Riester 162 Euro ausgewogen?";

export interface DemoStateContext {
  state: DemoState;
  demoMode: DemoMode;
  setDemoMode: (mode: DemoMode) => void;
  analysis: AnalyseResult | null;
  revealedStepCount: number;
  qaResult: QaResult | null;
  errorMessage: string | null;
  showMailToast: boolean;
  startAnalysis: () => void;
  advancePanel: () => void;
  runQa: (frage: string) => void;
  crmExecution: CrmExecutionInfo | null;
  reset: () => void;
  visiblePlanSteps: PlanStep[];
}

function getVisibleSteps(
  analysis: AnalyseResult | null,
  revealedCount: number,
): PlanStep[] {
  if (!analysis) return [];
  return analysis.plan_steps.slice(0, revealedCount);
}

export function useDemoState(
  initialMode: DemoMode = "auto",
  transcript: Transcript,
): DemoStateContext {
  const [state, setState] = useState<DemoState>("idle");
  const [demoMode, setDemoMode] = useState<DemoMode>(initialMode);
  const [analysis, setAnalysis] = useState<AnalyseResult | null>(null);
  const [revealedStepCount, setRevealedStepCount] = useState(0);
  const [qaResult, setQaResult] = useState<QaResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showMailToast, setShowMailToast] = useState(false);
  const [crmExecuted, setCrmExecuted] = useState(false);
  const [heroExecuted, setHeroExecuted] = useState(false);
  const [crmExecution, setCrmExecution] = useState<CrmExecutionInfo | null>(
    null,
  );
  const qaAutoRanRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (revealIntervalRef.current) {
      clearInterval(revealIntervalRef.current);
      revealIntervalRef.current = null;
    }
  }, []);

  const startPlanReveal = useCallback((data: AnalyseResult) => {
    setRevealedStepCount(0);
    const total = data.plan_steps.length;
    let count = 0;
    revealIntervalRef.current = setInterval(() => {
      count += 1;
      setRevealedStepCount(count);
      if (count >= total && revealIntervalRef.current) {
        clearInterval(revealIntervalRef.current);
        revealIntervalRef.current = null;
      }
    }, 380);
  }, []);

  const advancePanel = useCallback(() => {
    setState((current) => {
      const idx = PANEL_SEQUENCE.indexOf(
        current as (typeof PANEL_SEQUENCE)[number],
      );
      if (idx >= 0 && idx < PANEL_SEQUENCE.length - 1) {
        return PANEL_SEQUENCE[idx + 1];
      }
      if (idx === PANEL_SEQUENCE.length - 1) {
        return "qa_ready";
      }
      return current;
    });
  }, []);

  const startAnalysis = useCallback(async () => {
    clearTimers();
    setErrorMessage(null);
    setQaResult(null);
    setShowMailToast(false);
    setCrmExecuted(false);
    setHeroExecuted(false);
    setAnalysis(null);
    setRevealedStepCount(0);
    setState("analyzing");

    try {
      const data = await analyzeTranscript(transcript);
      setAnalysis(data);
      setState("plan_revealing");
      startPlanReveal(data);

      timerRef.current = setTimeout(() => {
        setState("panel_protokoll");
      }, AUTO_DELAYS_MS.plan_revealing ?? 2800);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Analyse fehlgeschlagen",
      );
      setState("error");
    }
  }, [clearTimers, startPlanReveal, transcript]);

  const runQa = useCallback(
    async (frage: string) => {
      clearTimers();
      setState("qa_loading");

      try {
        const result = await askQuestion(frage, [...transcript.meetings]);
        setQaResult(result);
        setState("qa_answered");
        timerRef.current = setTimeout(() => setState("complete"), 800);
      } catch {
        setQaResult(MOCK_QA);
        setState("qa_answered");
        timerRef.current = setTimeout(() => setState("complete"), 800);
      }
    },
    [clearTimers, transcript.meetings],
  );

  const reset = useCallback(() => {
    clearTimers();
    setState("idle");
    setAnalysis(null);
    setRevealedStepCount(0);
    setQaResult(null);
    setErrorMessage(null);
    setShowMailToast(false);
    setCrmExecuted(false);
    setHeroExecuted(false);
    setCrmExecution(null);
    qaAutoRanRef.current = false;
  }, [clearTimers]);

  // Execute CRM when CRM panel is shown
  useEffect(() => {
    if (state !== "panel_crm" || !analysis || crmExecuted) return;

    const crmActions = analysis.actions.filter((a) => a.typ === "crm_task");
    if (crmActions.length === 0) return;

    setCrmExecuted(true);
    void executeActions({
      kunde: transcript.kunde,
      kunde_email: "berger@example.de",
      actions: crmActions,
    })
      .then((response) => {
        const crm = response.results.find((r) => r.typ === "crm_task");
        if (crm) {
          const panel = crm.panel_data as { provider?: string } | undefined;
          setCrmExecution({
            status: crm.status,
            externalId: crm.external_id,
            provider: panel?.provider,
          });
        }
      })
      .catch(() => {
        setCrmExecution({ status: "mocked", provider: "mock" });
      });
  }, [state, analysis, crmExecuted, transcript.kunde]);

  // Hero: kalender + mail when kalender panel is reached
  useEffect(() => {
    if (state !== "panel_kalender" || !analysis || heroExecuted) return;

    const heroActions = analysis.actions.filter(
      (a) => a.typ === "kalender" || a.typ === "email_entwurf",
    );
    if (heroActions.length === 0) return;

    setHeroExecuted(true);
    void executeActions({
      kunde: transcript.kunde,
      kunde_email: "berger@example.de",
      actions: heroActions,
    })
      .then(() => setShowMailToast(true))
      .catch(() => setShowMailToast(true));
  }, [state, analysis, heroExecuted, transcript.kunde]);

  // Auto mode: run default Q&A when qa_ready is reached
  useEffect(() => {
    if (demoMode !== "auto" || state !== "qa_ready" || qaAutoRanRef.current) {
      return;
    }
    qaAutoRanRef.current = true;
    void runQa(DEMO_QA_QUESTION);
  }, [demoMode, state, runQa]);

  // Auto-advance through panel sequence
  useEffect(() => {
    if (demoMode !== "auto") return;
    if (!PANEL_SEQUENCE.includes(state as (typeof PANEL_SEQUENCE)[number]))
      return;

    const delay = AUTO_DELAYS_MS[state] ?? 1500;
    timerRef.current = setTimeout(() => advancePanel(), delay);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [state, demoMode, advancePanel]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  return {
    state,
    demoMode,
    setDemoMode,
    analysis,
    revealedStepCount,
    qaResult,
    errorMessage,
    showMailToast,
    startAnalysis,
    advancePanel,
    runQa,
    crmExecution,
    reset,
    visiblePlanSteps: getVisibleSteps(analysis, revealedStepCount),
  };
}
