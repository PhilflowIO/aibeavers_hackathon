/**
 * Server-side ENV helpers for API routes.
 * USE_MOCK_ANALYSIS defaults to true — demo runs without LLM/credentials.
 */

function parseBool(value: string | undefined, defaultValue: boolean): boolean {
  if (value == null || value === "") return defaultValue;
  return value.toLowerCase() === "true";
}

export function useMockAnalysis(): boolean {
  return parseBool(process.env.USE_MOCK_ANALYSIS, true);
}

export function getQwenConfig() {
  return {
    apiKey: process.env.QWEN_API_KEY ?? "",
    baseURL:
      process.env.QWEN_BASE_URL ??
      "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
    model: process.env.QWEN_MODEL ?? "qwen-max",
  };
}

export function getElevenLabsConfig() {
  return {
    apiKey: process.env.ELEVENLABS_API_KEY ?? "",
    voiceId: process.env.ELEVENLABS_VOICE_ID ?? "21m00Tcm4TlvDq8ikWAM",
  };
}
