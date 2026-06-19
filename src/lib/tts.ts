"use client";

// ── Audio cache ───────────────────────────────────────────────────────────────
const audioCache = new Map<string, string>();

// ── Voice loading — wait for voiceschanged so Google online voices are ready ──
let _voicesPromise: Promise<SpeechSynthesisVoice[]> | null = null;

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (_voicesPromise) return _voicesPromise;
  _voicesPromise = new Promise((resolve) => {
    if (typeof window === "undefined") { resolve([]); return; }
    const quick = window.speechSynthesis.getVoices();
    if (quick.length > 0) { resolve(quick); return; }
    const done = () => resolve(window.speechSynthesis.getVoices());
    window.speechSynthesis.addEventListener("voiceschanged", done, { once: true });
    setTimeout(done, 2500);
  });
  return _voicesPromise;
}

function pickBestVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  return (
    voices.find((v) => v.lang === "es-ES" && /google/i.test(v.name)) ||
    voices.find((v) => v.lang.startsWith("es") && /google/i.test(v.name)) ||
    voices.find((v) => v.lang.startsWith("es") && !v.localService) ||
    voices.find((v) => v.lang.startsWith("es")) ||
    null
  );
}

// ── Server TTS (OpenAI tts-1-hd) — only if TTS_API_KEY is set ────────────────
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
    await audio.play();
    return true;
  } catch {
    return false;
  }
}

// ── Web Speech API (Google online voice — free) ───────────────────────────────
async function speakWebSpeech(text: string, lang = "es-ES"): Promise<void> {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  await new Promise((r) => setTimeout(r, 50)); // let cancel flush

  const voices = await loadVoices();
  const voice = pickBestVoice(voices);

  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = 0.8;
  u.pitch = 1.0;
  if (voice) u.voice = voice;

  window.speechSynthesis.speak(u);
}

// ── Public API ────────────────────────────────────────────────────────────────
// Kick off voice loading as early as possible (before user clicks anything)
if (typeof window !== "undefined" && window.speechSynthesis) {
  window.speechSynthesis.getVoices();
}

let _serverAvailable: boolean | null = null;

export async function speak(text: string, lang = "es-ES"): Promise<void> {
  if (!text?.trim()) return;

  // First call: probe server TTS
  if (_serverAvailable === null) {
    _serverAvailable = await speakServerTTS(text);
    if (!_serverAvailable) await speakWebSpeech(text, lang);
    return;
  }

  if (_serverAvailable) {
    const ok = await speakServerTTS(text);
    if (!ok) await speakWebSpeech(text, lang);
  } else {
    await speakWebSpeech(text, lang);
  }
}

export function stopSpeech(): void {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}
