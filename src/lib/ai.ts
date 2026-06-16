import OpenAI from "openai";

// Generic OpenAI-compatible client.
// Set AI_BASE_URL + AI_API_KEY in .env.local to any provider:
//   Ollama:      AI_BASE_URL=http://localhost:11434/v1  AI_API_KEY=ollama
//   OpenRouter:  AI_BASE_URL=https://openrouter.ai/api/v1  AI_API_KEY=sk-or-...
//   OpenAI:      AI_BASE_URL=https://api.openai.com/v1  AI_API_KEY=sk-...
let _client: OpenAI | null = null;

export function getAI() {
  if (!_client) {
    _client = new OpenAI({
      baseURL: process.env.AI_BASE_URL || "https://openrouter.ai/api/v1",
      apiKey: process.env.AI_API_KEY || "no-key",
    });
  }
  return _client;
}

export const CHAT_MODEL =
  process.env.CHAT_MODEL || "meta-llama/llama-3.1-8b-instruct:free";
