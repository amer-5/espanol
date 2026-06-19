"use client";

// ── Audio cache ───────────────────────────────────────────────────────────────
const audioCache = new Map<string, string>();

// ── Server TTS (ElevenLabs via /api/tts) ─────────────────────────────────────
// NEXT_PUBLIC_TTS_SERVER=true means ElevenLabs API key is configured
const SERVER_ENABLED = process.env.NEXT_PUBLIC_TTS_SERVER === "true";

async function speakServerTTS(text: string): Promise<boolean> {
  try {
    let blobUrl = audioCache.get(text);
    if (!blobUrl) {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) return false;
      const blob = await res.blob();
      blobUrl = URL.createObjectURL(blob);
      audioCache.set(text, blobUrl);
    }
    const audio = new Audio(blobUrl);
    audio.play();
    return true;
  } catch {
    return false;
  }
}

// ── Web Speech API fallback ───────────────────────────────────────────────────
let _voicesPromise: Promise<SpeechSynthesisVoice[]> | null = null;

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (_voicesPromise) return _voicesPromise;
  _voicesPromise = new Promise((resolve) => {
    if (typeof window === "undefined") { resolve([]); return; }
    const quick = window.speechSynthesis.getVoices();
    if (quick.length > 0) { resolve(quick); return; }
    const done = () => resolve(window.speechSynthesis.getVoices());
    window.speechSynthesis.addEventListener("voiceschanged", done, { once: true });
    setTimeout(done, 3000);
  });
  return _voicesPromise;
}

function speakWebSpeech(text: string, lang = "es-ES"): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();

  const voices = window.speechSynthesis.getVoices();
  const voice =
    voices.find((v) => v.lang === "es-ES" && /google/i.test(v.name)) ||
    voices.find((v) => v.lang.startsWith("es") && /google/i.test(v.name)) ||
    voices.find((v) => v.lang.startsWith("es") && !v.localService) ||
    voices.find((v) => v.lang.startsWith("es")) ||
    null;

  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = 0.8;
  u.pitch = 1.0;
  if (voice) u.voice = voice;
  window.speechSynthesis.speak(u);
}

// Warm up voice loading early
if (typeof window !== "undefined" && window.speechSynthesis) {
  window.speechSynthesis.getVoices();
  loadVoices();
}

// ── Public API ────────────────────────────────────────────────────────────────
export async function speak(text: string, lang = "es-ES"): Promise<void> {
  if (!text?.trim()) return;

  if (SERVER_ENABLED) {
    const ok = await speakServerTTS(text);
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
