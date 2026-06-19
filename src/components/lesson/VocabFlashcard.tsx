"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import type { VocabItem } from "@/types/lesson";
import { speak } from "@/lib/tts";
import { ChevronRight, Mic, MicOff, CheckCircle2, XCircle, Volume2, RefreshCw } from "lucide-react";

interface Props {
  vocab: VocabItem[];
  onComplete: () => void;
}

type Direction = "es_to_bs" | "bs_to_es";
type MicState = "idle" | "listening" | "correct" | "wrong";

interface CardEntry {
  word: VocabItem;
  direction: Direction;
  round: number; // 1-5
}

// Normalize for comparison: strip accents, punctuation, lowercase
function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z\s]/g, "")
    .trim();
}

// Build shuffled sequence: each word 5 times, mixed across all words
// No same word appears twice in a row
function buildSequence(vocab: VocabItem[]): CardEntry[] {
  const all: CardEntry[] = [];
  for (const word of vocab) {
    for (let r = 1; r <= 5; r++) {
      all.push({ word, direction: r % 2 === 1 ? "es_to_bs" : "bs_to_es", round: r });
    }
  }

  // Fisher-Yates shuffle
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }

  // Fix consecutive duplicates: swap with next non-duplicate
  for (let i = 0; i < all.length - 1; i++) {
    if (all[i].word.es === all[i + 1].word.es) {
      for (let j = i + 2; j < all.length; j++) {
        if (all[j].word.es !== all[i].word.es) {
          [all[i + 1], all[j]] = [all[j], all[i + 1]];
          break;
        }
      }
    }
  }
  return all;
}

export default function VocabFlashcard({ vocab, onComplete }: Props) {
  const [sequence] = useState<CardEntry[]>(() => buildSequence(vocab));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [micState, setMicState] = useState<MicState>("idle");
  const [heard, setHeard] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recogRef = useRef<any>(null);

  const entry = sequence[index];
  const { word, direction, round } = entry;
  const isEsFirst = direction === "es_to_bs";

  // Auto-play TTS when card changes
  // es_to_bs → play Spanish immediately
  // bs_to_es → no auto-play (user should recall first)
  useEffect(() => {
    setFlipped(false);
    setMicState("idle");
    setHeard("");
    if (isEsFirst) {
      speak(word.es);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const next = useCallback(() => {
    if (index < sequence.length - 1) {
      setIndex((i) => i + 1);
    } else {
      onComplete();
    }
  }, [index, sequence.length, onComplete]);

  // Auto-advance 1.5s after correct pronunciation
  useEffect(() => {
    if (micState === "correct") {
      const t = setTimeout(next, 1500);
      return () => clearTimeout(t);
    }
  }, [micState, next]);

  const startListening = () => {
    const SR =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;

    if (!SR) {
      alert("Tvoj browser ne podržava prepoznavanje govora. Koristi Chrome ili Brave.");
      return;
    }

    // Always play Spanish TTS first, then listen after 1.5s
    speak(word.es);
    setMicState("listening");
    setHeard("");

    setTimeout(() => {
      const rec = new SR();
      rec.lang = "es-ES";
      rec.interimResults = false;
      rec.maxAlternatives = 3;
      recogRef.current = rec;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rec.onresult = (e: any) => {
        const results = Array.from(e.results[0]).map((r) => (r as { transcript: string }).transcript);
        const h = results[0];
        setHeard(h);
        const correct = normalize(word.es);
        const match = results.some(
          (r) => normalize(r) === correct || normalize(r).includes(correct)
        );
        setMicState(match ? "correct" : "wrong");
      };

      rec.onerror = () => setMicState("idle");
      rec.onend = () => setMicState((s) => (s === "listening" ? "idle" : s));
      rec.start();
    }, 1500);
  };

  const stopListening = () => {
    recogRef.current?.stop();
    setMicState("idle");
  };

  // How many unique words seen so far (by first appearance in shuffled sequence)
  const uniqueWordsSeen = new Set(sequence.slice(0, index + 1).map((e) => e.word.es)).size;

  const totalCards = sequence.length;
  const progress = ((index + 1) / totalCards) * 100;

  return (
    <div className="flex flex-col min-h-[70vh]">
      {/* Progress */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
          <span>Riječ {uniqueWordsSeen}/{vocab.length} · ponavljanje {round}/5</span>
          <span>{index + 1}/{totalCards}</span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        {/* Direction badge */}
        <div className="flex gap-2 mt-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            isEsFirst
              ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
              : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
          }`}>
            {isEsFirst ? "🇪🇸 Španski → Bosanski" : "🇧🇦 Bosanski → Španski"}
          </span>
        </div>
      </div>

      {/* Card */}
      <div
        className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-8 cursor-pointer select-none min-h-[280px]"
        onClick={() => setFlipped((f) => !f)}
      >
        {!flipped ? (
          // Front side
          <div className="text-center space-y-3 w-full">
            <p className="text-xs text-gray-400 uppercase tracking-widest">
              {isEsFirst ? "Španski" : "Bosanski"}
            </p>
            <p className={`font-bold ${isEsFirst ? "text-5xl text-emerald-600 dark:text-emerald-400" : "text-4xl text-blue-600 dark:text-blue-400"}`}>
              {isEsFirst ? word.es : word.bs}
            </p>
            {isEsFirst && word.ipa && (
              <p className="text-sm text-gray-400 font-mono">[{word.ipa}]</p>
            )}
            {isEsFirst && (
              <button
                onClick={(e) => { e.stopPropagation(); speak(word.es); }}
                className="mt-2 p-2 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 cursor-pointer"
                aria-label="Izgovor"
              >
                <Volume2 className="w-5 h-5" />
              </button>
            )}
            <p className="text-xs text-gray-400 mt-3">Tapni da vidiš {isEsFirst ? "prijevod" : "špansku riječ"}</p>
          </div>
        ) : (
          // Back side
          <div className="text-center space-y-4 w-full">
            <p className="text-xs text-gray-400 uppercase tracking-widest">
              {isEsFirst ? "Bosanski" : "Španski"}
            </p>
            <div className="flex items-center justify-center gap-3">
              <p className={`font-bold ${isEsFirst ? "text-3xl text-gray-800 dark:text-gray-100" : "text-4xl text-emerald-600 dark:text-emerald-400"}`}>
                {isEsFirst ? word.bs : word.es}
              </p>
              {/* Always show audio for Spanish */}
              <button
                onClick={(e) => { e.stopPropagation(); speak(word.es); }}
                className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 cursor-pointer"
                aria-label="Izgovor"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>
            {!isEsFirst && word.ipa && (
              <p className="text-sm text-gray-400 font-mono">[{word.ipa}]</p>
            )}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 text-left space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-700 dark:text-gray-200 italic flex-1">{word.example_es}</p>
                <button
                  onClick={(e) => { e.stopPropagation(); speak(word.example_es); }}
                  className="p-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex-shrink-0 cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-gray-400">{word.example_bs}</p>
            </div>
          </div>
        )}
      </div>

      {/* Mic feedback */}
      {micState === "wrong" && heard && (
        <div className="mt-3 flex items-center gap-2 bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-2.5 text-sm">
          <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span className="text-red-700 dark:text-red-300">
            Čuo sam: "<strong>{heard}</strong>" · tačno: <strong>{word.es}</strong>
          </span>
        </div>
      )}
      {micState === "correct" && (
        <div className="mt-3 flex items-center gap-2 bg-green-50 dark:bg-green-900/20 rounded-xl px-4 py-2.5 text-sm">
          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
          <span className="text-green-700 dark:text-green-300 font-medium">Odlično! Prelazimo dalje...</span>
        </div>
      )}
      {micState === "listening" && (
        <div className="mt-3 flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl px-4 py-2.5 text-sm">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse flex-shrink-0" />
          <span className="text-blue-700 dark:text-blue-300">
            Slušam... izgovori <strong>"{word.es}"</strong>
          </span>
        </div>
      )}

      {/* Bottom controls */}
      <div className="mt-4 flex items-center gap-3">
        {/* Repeat button */}
        <button
          onClick={() => speak(word.es)}
          className="w-12 h-14 rounded-2xl bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition-all cursor-pointer"
          aria-label="Ponovi izgovor"
        >
          <RefreshCw className="w-5 h-5" />
        </button>

        {/* Mic button */}
        <button
          onClick={micState === "listening" ? stopListening : startListening}
          disabled={micState === "correct"}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow flex-shrink-0 ${
            micState === "listening"
              ? "bg-red-500 text-white scale-110 animate-pulse"
              : micState === "correct"
              ? "bg-green-500 text-white"
              : micState === "wrong"
              ? "bg-orange-100 dark:bg-orange-900/30 text-orange-500"
              : "bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600"
          }`}
          aria-label="Mikrofon"
        >
          {micState === "listening"
            ? <MicOff className="w-6 h-6" />
            : micState === "correct"
            ? <CheckCircle2 className="w-6 h-6" />
            : <Mic className="w-6 h-6" />}
        </button>

        {/* Next button */}
        <button
          onClick={next}
          className="flex-1 h-14 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all text-base shadow"
        >
          {index < sequence.length - 1 ? (
            <>Dalje <ChevronRight className="w-5 h-5" /></>
          ) : (
            <>Završi vokabular ✓</>
          )}
        </button>
      </div>
    </div>
  );
}
