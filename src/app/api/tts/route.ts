import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // TTS uses dedicated key — Groq/OpenRouter don't have audio endpoints
  const apiKey = process.env.TTS_API_KEY ?? process.env.OPENAI_API_KEY;
  // Always use OpenAI for TTS regardless of AI_BASE_URL
  const baseUrl = "https://api.openai.com/v1";

  if (!apiKey) {
    return NextResponse.json({ error: "TTS not configured" }, { status: 503 });
  }

  const { text } = await req.json();
  if (!text) {
    return NextResponse.json({ error: "No text provided" }, { status: 400 });
  }

  const res = await fetch(`${baseUrl}/audio/speech`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1-hd",   // HD model — noticeably clearer
      input: text,
      voice: "shimmer",    // warm, clear female voice — best for Spanish learning
      speed: 0.85,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("TTS API error:", err);
    return NextResponse.json({ error: "TTS failed" }, { status: 502 });
  }

  const audio = await res.arrayBuffer();
  return new NextResponse(audio, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
