"use client";

// ── Audio cache (URL → blob URL) so we don't re-fetch the same audio ──────────
const cache = new Map<string, string>();

// ── Server-side TTS (OpenAI tts-1 via /api/tts) ───────────────────────────────
async function speakServerTTS(text: string, lang = "es-ES"): Promise<boolean> {
  const key = `${lang}::${text}`;
  try {
    let blobUrl = cache.get(key);
    if (!blobUrl) {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, lang }),
      });
      if (!res.ok) return false;
      const blob = await res.blob();
      blobUrl = URL.createObjectURL(blob);
      cache.set(key, blobUrl);
    }
    const audio = new Audio(blobUrl);
    audio.play();
    return true;
  } catch {
    return false;
  }
}

// ── Web Speech API fallback (prefer Google voices) ────────────────────────────
function speakWebSpeech(text: string, lang = "es-ES"): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.78;
  utterance.pitch = 1.05;

  const voices = window.speechSynthesis.getVoices();

  // Priority: Google neural > any Google > any matching lang > first available
  const pick =
    voices.find((v) => v.lang.startsWith("es") && v.name.toLowerCase().includes("google")) ||
    voices.find((v) => v.lang.startsWith("es") && v.localService === false) ||
    voices.find((v) => v.lang.startsWith("es")) ||
    null;

  if (pick) utterance.voice = pick;
  window.speechSynthesis.speak(utterance);
}

// ── Public API ─────────────────────────────────────────────────────────────────
let _serverTTSAvailable: boolean | null = null;

export async function speak(text: string, lang = "es-ES"): Promise<void> {
  if (!text) return;

  // Check once whether server TTS is available
  if (_serverTTSAvailable === null) {
    _serverTTSAvailable = await speakServerTTS(text, lang);
    if (!_serverTTSAvailable) speakWebSpeech(text, lang);
    return;
  }

  if (_serverTTSAvailable) {
    const ok = await speakServerTTS(text, lang);
    if (!ok) speakWebSpeech(text, lang);
  } else {
    speakWebSpeech(text, lang);
  }
}

export function stopSpeech(): void {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}
