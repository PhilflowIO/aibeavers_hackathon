import type { Action, Analysis, Meeting, QaResponse } from "@aibeavers/shared";
import type { ExecuteActionsResponse } from "@/app/api/lib/execute-helpers";

export type AnalysisResult = Analysis;
export type QaResult = QaResponse;

async function parseJson<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) {
    const message =
      typeof data === "object" && data && "error" in data
        ? String((data as { error: string }).error)
        : response.statusText;
    throw new Error(message);
  }
  return data as T;
}

export async function analyzeTranscript(
  transcript?: unknown
): Promise<AnalysisResult> {
  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(transcript != null ? { transcript } : {}),
  });
  return parseJson<AnalysisResult>(response);
}

export async function askQuestion(
  frage: string,
  meetings: Meeting[]
): Promise<QaResult> {
  const response = await fetch("/api/qa", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ frage, meetings }),
  });
  return parseJson<QaResult>(response);
}

export async function executeActions(params: {
  kunde: string;
  kunde_email?: string;
  actions: Action[];
  execution_token?: string;
}): Promise<ExecuteActionsResponse> {
  const response = await fetch("/api/execute-actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return parseJson<ExecuteActionsResponse>(response);
}

export async function synthesizeSpeech(text: string): Promise<Blob> {
  const response = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const data = (await response.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      // non-JSON error body
    }
    throw new Error(message);
  }

  return response.blob();
}
