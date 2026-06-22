import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audio = formData.get("audio") as Blob | null;
    if (!audio) return NextResponse.json({ error: "No audio" }, { status: 400 });

    const eleven = new FormData();
    eleven.append("file", audio, "audio.webm");
    eleven.append("model_id", "scribe_v1");

    const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY! },
      body: eleven,
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("ElevenLabs STT error:", err);
      // Fallback to Groq Whisper
      const groqForm = new FormData();
      groqForm.append("file", audio, "audio.webm");
      groqForm.append("model", "whisper-large-v3-turbo");
      groqForm.append("response_format", "json");
      const groqRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.AI_API_KEY}` },
        body: groqForm,
      });
      if (!groqRes.ok) return NextResponse.json({ error: "Transcription failed" }, { status: 500 });
      const { text: groqText } = await groqRes.json();
      return NextResponse.json({ text: groqText?.trim() ?? "" });
    }

    const data = await res.json();
    const text = data.text ?? data.transcript ?? "";
    return NextResponse.json({ text: text.trim() });
  } catch (err) {
    console.error("Transcribe error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
