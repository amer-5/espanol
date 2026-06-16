"use client";

// TTS abstraction — currently uses Web Speech API, can be swapped for better TTS later
let currentUtterance: SpeechSynthesisUtterance | null = null;

export function speak(text: string, lang = "es-ES"): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.9;
  utterance.pitch = 1.0;

  // Prefer a Spanish voice if available
  const voices = window.speechSynthesis.getVoices();
  const esVoice = voices.find(
    (v) => v.lang.startsWith("es") && !v.name.includes("Google")
  ) || voices.find((v) => v.lang.startsWith("es"));
  if (esVoice) utterance.voice = esVoice;

  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeech(): void {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

export function isSpeaking(): boolean {
  if (typeof window === "undefined") return false;
  return window.speechSynthesis?.speaking ?? false;
}
