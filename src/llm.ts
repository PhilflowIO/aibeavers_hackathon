import { ChatAnthropic } from "@langchain/anthropic";
import { loadLlmConfig } from "./config.js";

/**
 * Erzeugt das Claude-Modell für den Agenten.
 * Temperatur 0 — der Nacharbeits-Agent soll deterministisch handeln,
 * nicht kreativ improvisieren.
 */
export function createLlm() {
  const cfg = loadLlmConfig();
  return new ChatAnthropic({
    apiKey: cfg.ANTHROPIC_API_KEY,
    model: cfg.ANTHROPIC_MODEL,
    temperature: 0,
    maxTokens: 4096,
  });
}
