import OpenAI from "openai";

// Singleton OpenRouter client
let _client: OpenAI | null = null;

export function getOpenRouter() {
  if (!_client) {
    _client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY!,
      defaultHeaders: {
        "HTTP-Referer": "https://espanol.vercel.app",
        "X-Title": "Espanol - Spanish Learning App",
      },
    });
  }
  return _client;
}

// Free models on OpenRouter (verified working):
// "meta-llama/llama-3.1-8b-instruct:free"   — brz, pouzdan
// "mistralai/mistral-7b-instruct:free"       — alternativa
// "deepseek/deepseek-r1-0528:free"           — sporiji ali bolji
export const CHAT_MODEL =
  process.env.CHAT_MODEL || "meta-llama/llama-3.1-8b-instruct:free";
