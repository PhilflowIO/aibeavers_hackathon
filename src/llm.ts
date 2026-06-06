import { ChatOpenAI } from "@langchain/openai";
import { loadLlmConfig } from "./config.js";

/**
 * Erzeugt das Qwen-Modell für den Agenten — über die OpenAI-kompatible API
 * (DashScope o.ä.). Temperatur 0: der Nacharbeits-Agent soll deterministisch
 * handeln, nicht kreativ improvisieren.
 */
export function createLlm() {
  const cfg = loadLlmConfig();
  return new ChatOpenAI({
    apiKey: cfg.QWEN_API_KEY,
    model: cfg.QWEN_MODEL,
    temperature: 0,
    maxTokens: 4096,
    configuration: {
      baseURL: cfg.QWEN_BASE_URL,
    },
  });
}
