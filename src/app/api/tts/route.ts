import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.AI_API_KEY;
  const baseUrl = process.env.AI_BASE_URL ?? "https://api.openai.com/v1";

  if (!apiKey) {
    return NextResponse.json({ error: "TTS not configured" }, { status: 503 });
  }

  const { text, lang } = await req.json();
  if (!text) {
    return NextResponse.json({ error: "No text provided" }, { status: 400 });
  }

  // Pick voice based on language — nova is clear and natural for Spanish
  const voice = lang?.startsWith("es") ? "nova" : "alloy";

  const res = await fetch(`${baseUrl}/audio/speech`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1",
      input: text,
      voice,
      speed: 0.9,
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
