"use client";

// ── Audio cache ───────────────────────────────────────────────────────────────
const audioCache = new Map<string, string>();

// ── Voice cache — loaded once after voiceschanged fires ───────────────────────
let _voicesReady: Promise<SpeechSynthesisVoice[]> | null = null;

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (_voicesReady) return _voicesReady;
  _voicesReady = new Promise((resolve) => {
    const immediate = window.speechSynthesis.getVoices();
    if (immediate.length > 0) { resolve(immediate); return; }
    const handler = () => resolve(window.speechSynthesis.getVoices());
    window.speechSynthesis.addEventListener("voiceschanged", handler, { once: true });
    // Safety timeout — resolve whatever is available after 2s
    setTimeout(() => resolve(window.speechSynthesis.getVoices()), 2000);
  });
  return _voicesReady;
}

// Pick best Spanish voice: prefer Google online neural, then any online, then local
async function pickVoice(): Promise<SpeechSynthesisVoice | null> {
  const voices = await loadVoices();
  return (
    voices.find((v) => v.lang === "es-ES" && v.name.toLowerCase().includes("google")) ||
    voices.find((v) => v.lang.startsWith("es-ES") && !v.localService) ||
    voices.find((v) => v.lang.startsWith("es") && v.name.toLowerCase().includes("google")) ||
    voices.find((v) => v.lang.startsWith("es") && !v.localService) ||
    voices.find((v) => v.lang.startsWith("es")) ||
    null
  );
}

// ── Server-side TTS (OpenAI tts-1-hd via /api/tts) ───────────────────────────
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

// ── Web Speech API (Google online voice — free, sounds natural) ───────────────
async function speakWebSpeech(text: string, lang = "es-ES"): Promise<void> {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();

  const voice = await pickVoice();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.8;
  utterance.pitch = 1.0;
  if (voice) utterance.voice = voice;

  window.speechSynthesis.speak(utterance);
}

// ── Public API ────────────────────────────────────────────────────────────────
// Warm up voice loading on first import
if (typeof window !== "undefined") {
  window.speechSynthesis.getVoices(); // triggers voiceschanged in Chrome
}

let _serverAvailable: boolean | null = null;

export async function speak(text: string, lang = "es-ES"): Promise<void> {
  if (!text) return;

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
