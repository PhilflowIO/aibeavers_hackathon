import { ChatOpenAI } from "@langchain/openai";
import { getQwenConfig } from "./env";

/**
 * Qwen via OpenAI-compatible API — only used when USE_MOCK_ANALYSIS=false.
 */
export function createLlm() {
  const cfg = getQwenConfig();
  if (!cfg.apiKey) {
    throw new Error("QWEN_API_KEY fehlt");
  }
  return new ChatOpenAI({
    apiKey: cfg.apiKey,
    model: cfg.model,
    temperature: 0,
    maxTokens: 4096,
    modelKwargs: {
      response_format: { type: "json_object" },
    },
    configuration: {
      baseURL: cfg.baseURL,
    },
  });
}
