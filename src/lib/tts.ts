"use client";

// ── Audio cache ───────────────────────────────────────────────────────────────
const audioCache = new Map<string, string>();

// ── Voice loading ─────────────────────────────────────────────────────────────
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

// ── Server TTS availability — probed ONCE at module load, not on first speak ──
// This prevents the first speak() from hanging on a network request
let _serverAvailable = false; // default: use browser TTS

async function probeServerTTS(): Promise<void> {
  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "hola" }),
    });
    if (res.ok) {
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      audioCache.set("hola", blobUrl);
      _serverAvailable = true;
    }
  } catch {
    // server TTS not available — use browser
  }
}

// ── Server TTS playback ───────────────────────────────────────────────────────
async function speakServerTTS(text: string): Promise<boolean> {
  try {
    let blobUrl = audioCache.get(text);
    if (!blobUrl) {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) { _serverAvailable = false; return false; }
      const blob = await res.blob();
      blobUrl = URL.createObjectURL(blob);
      audioCache.set(text, blobUrl);
    }
    const audio = new Audio(blobUrl);
    audio.play();
    return true;
  } catch {
    _serverAvailable = false;
    return false;
  }
}

// ── Web Speech API ────────────────────────────────────────────────────────────
async function speakWebSpeech(text: string, lang = "es-ES"): Promise<void> {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  await new Promise((r) => setTimeout(r, 50));

  const voices = await loadVoices();
  const voice = pickBestVoice(voices);

  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = 0.8;
  u.pitch = 1.0;
  if (voice) u.voice = voice;
  window.speechSynthesis.speak(u);
}

// ── Init: kick off voice loading + server probe in background ─────────────────
if (typeof window !== "undefined") {
  window.speechSynthesis.getVoices(); // triggers voiceschanged in Chrome
  loadVoices();                        // warm up promise
  probeServerTTS();                    // probe server in background — won't block speak()
}

// ── Public API ────────────────────────────────────────────────────────────────
export async function speak(text: string, lang = "es-ES"): Promise<void> {
  if (!text?.trim()) return;

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
