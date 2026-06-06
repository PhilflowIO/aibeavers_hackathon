import {
  analysisSchema,
  analysisBerger1,
  transcriptSchema,
  type Analysis,
} from "@aibeavers/shared";
import { NextResponse } from "next/server";
import { useMockAnalysis } from "../lib/env";
import { createLlm } from "../lib/llm";
import { invokeJsonLlm } from "../lib/llm-json";
import { ANALYSE_SYSTEM_PROMPT } from "../lib/prompts";
import {
  flattenTranscriptForLlm,
  loadDefaultTranscript,
} from "../lib/transcript";
import { DEMO_RECIPIENT_EMAIL } from "../../../lib/demo-config";

export type AnalysisResult = Analysis;

/**
 * Override the demo recipient in the served fixture so a custom
 * NEXT_PUBLIC_DEMO_RECIPIENT_EMAIL flows through to the email_entwurf empfaenger
 * (and thus matches the live allowlist + the actual send), not just the kalender
 * invite (which already follows kunde_email).
 */
function withDemoRecipient(analysis: Analysis): Analysis {
  return {
    ...analysis,
    actions: analysis.actions.map((action) =>
      action.typ === "email_entwurf"
        ? { ...action, empfaenger: DEMO_RECIPIENT_EMAIL }
        : action,
    ),
  };
}

export async function POST(request: Request) {
  try {
    let body: { transcript?: unknown } = {};
    try {
      body = (await request.json()) as { transcript?: unknown };
    } catch {
      // empty body → default transcript
    }

    if (useMockAnalysis()) {
      return NextResponse.json(
        withDemoRecipient(analysisBerger1 as AnalysisResult),
      );
    }

    const transcript =
      body.transcript != null
        ? transcriptSchema.parse(body.transcript)
        : await loadDefaultTranscript();

    const segments = flattenTranscriptForLlm(transcript);
    const userContent = `<transkript>${JSON.stringify(segments)}</transkript>`;

    const llm = createLlm();
    const result = await invokeJsonLlm(
      llm,
      ANALYSE_SYSTEM_PROMPT,
      userContent,
      analysisSchema
    );

    return NextResponse.json(result satisfies AnalysisResult);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.includes("QWEN_API_KEY") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
