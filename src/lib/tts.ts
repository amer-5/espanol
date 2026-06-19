"use client";

// ── Audio cache ───────────────────────────────────────────────────────────────
const audioCache = new Map<string, string>();
const preloadInFlight = new Set<string>();

// ── Server TTS (ElevenLabs via /api/tts) ─────────────────────────────────────
const SERVER_ENABLED = process.env.NEXT_PUBLIC_TTS_SERVER === "true";

async function fetchServerTTS(text: string): Promise<string | null> {
  if (audioCache.has(text)) return audioCache.get(text)!;
  if (preloadInFlight.has(text)) return null; // already fetching
  preloadInFlight.add(text);
  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    audioCache.set(text, url);
    return url;
  } catch {
    return null;
  } finally {
    preloadInFlight.delete(text);
  }
}

async function speakServerTTS(text: string): Promise<boolean> {
  const url = await fetchServerTTS(text);
  if (!url) return false;
  new Audio(url).play();
  return true;
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

// Preload a batch of texts in background (fire-and-forget, no duplicates)
export function preloadTTS(texts: string[]): void {
  if (!SERVER_ENABLED) return;
  for (const text of texts) {
    if (text?.trim() && !audioCache.has(text) && !preloadInFlight.has(text)) {
      fetchServerTTS(text);
    }
  }
}

export function stopSpeech(): void {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}
