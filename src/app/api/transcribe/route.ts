import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audio = formData.get("audio") as Blob | null;
    if (!audio) return NextResponse.json({ error: "No audio" }, { status: 400 });

    const groqForm = new FormData();
    groqForm.append("file", audio, "audio.webm");
    groqForm.append("model", "whisper-large-v3-turbo");
    groqForm.append("response_format", "json");

    const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.AI_API_KEY}` },
      body: groqForm,
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Whisper error:", err);
      return NextResponse.json({ error: "Transcription failed" }, { status: 500 });
    }

    const { text } = await res.json();
    return NextResponse.json({ text: text?.trim() ?? "" });
  } catch (err) {
    console.error("Transcribe error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
