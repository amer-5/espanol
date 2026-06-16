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

// Free models worth using (pick one as default):
// "meta-llama/llama-3.1-8b-instruct:free"      — brz, solidan za A1/A2
// "google/gemma-3-12b-it:free"                  — dobar za instrukcije
// "deepseek/deepseek-r1-0528:free"              — najinteligentniji free model, sporiji
// "mistralai/mistral-7b-instruct:free"          — pouzdan
export const CHAT_MODEL =
  process.env.CHAT_MODEL || "meta-llama/llama-3.1-8b-instruct:free";

export const SEED_MODEL =
  process.env.SEED_MODEL || "google/gemma-3-12b-it:free";
