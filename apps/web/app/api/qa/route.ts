import {
  qaResponseSchema,
  qaSparrate,
  qaOffenePunkte,
  qaRefusal,
  transcriptSchema,
  type QaResponse,
} from "@aibeavers/shared";
import { NextResponse } from "next/server";
import { useMockAnalysis } from "../lib/env";
import { createLlm } from "../lib/llm";
import { invokeJsonLlm } from "../lib/llm-json";
import { QA_SYSTEM_PROMPT } from "../lib/prompts";
import { flattenTranscriptForLlm } from "../lib/transcript";

export type QaResult = QaResponse;

function matchQaMock(frage: string): QaResponse {
  const q = frage.toLowerCase();

  if (
    /162|sparrate|einzahl|monatlich|zahlt|beitrag/.test(q)
  ) {
    return qaSparrate;
  }

  if (
    /offene?\s+punkte|offen|lücken|noch\s+offen|beide\s+termine/.test(q)
  ) {
    return qaOffenePunkte;
  }

  if (/risikoneigung|ausgewogen/.test(q) && !/162|sparrate/.test(q)) {
    return {
      antwort:
        "Die Risikoneigung wurde als ausgewogen beschrieben — kein Aktien-Panik, aber auch nicht alles in Aktien.",
      belege: [{ meeting_id: "berger-1", start_sec: 107 }],
      gedeckt: true,
    };
  }

  return qaRefusal;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      frage?: string;
      meetings?: unknown;
    };

    if (!body.frage?.trim()) {
      return NextResponse.json(
        { error: "frage ist erforderlich" },
        { status: 400 }
      );
    }

    if (!body.meetings) {
      return NextResponse.json(
        { error: "meetings ist erforderlich" },
        { status: 400 }
      );
    }

    if (useMockAnalysis()) {
      return NextResponse.json(matchQaMock(body.frage));
    }

    const meetings = transcriptSchema.shape.meetings.parse(body.meetings);
    const segments = flattenTranscriptForLlm({ kunde: "", meetings });
    const userContent = [
      `<transkript>${JSON.stringify(segments)}</transkript>`,
      `<frage>${body.frage}</frage>`,
    ].join("\n");

    const llm = createLlm();
    const result = await invokeJsonLlm(
      llm,
      QA_SYSTEM_PROMPT,
      userContent,
      qaResponseSchema
    );

    return NextResponse.json(result satisfies QaResult);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status =
      message.includes("QWEN_API_KEY") ? 503 : message.includes("Required") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
