import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import type { ChatOpenAI } from "@langchain/openai";
import type { z } from "zod";

/** Strip optional markdown fences from model output. */
export function extractJsonText(raw: string): string {
  const trimmed = raw.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)```$/i.exec(trimmed);
  return (fenced?.[1] ?? trimmed).trim();
}

export function parseJsonSafe(text: string): unknown {
  return JSON.parse(extractJsonText(text));
}

export async function invokeJsonLlm<T extends z.ZodTypeAny>(
  llm: ChatOpenAI,
  systemPrompt: string,
  userContent: string,
  schema: T,
  repairHint = "Antwort war kein gültiges JSON, korrigiere und antworte nur mit JSON."
): Promise<z.infer<T>> {
  const messages: BaseMessage[] = [
    new SystemMessage(systemPrompt),
    new HumanMessage(userContent),
  ];

  let lastError = "Unbekannter Fehler";
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await llm.invoke(messages);
    const text =
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);

    try {
      const parsed = parseJsonSafe(text);
      const validated = schema.safeParse(parsed);
      if (validated.success) return validated.data;
      lastError = validated.error.message;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }

    if (attempt === 0) {
      messages.push(new AIMessage(text), new HumanMessage(repairHint));
    }
  }

  throw new Error(`LLM-JSON ungültig: ${lastError}`);
}
