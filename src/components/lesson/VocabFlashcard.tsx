"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import type { VocabItem } from "@/types/lesson";
import { speak, preloadTTS } from "@/lib/tts";
import { ChevronRight, ChevronLeft, Mic, MicOff, CheckCircle2, XCircle, Volume2, RefreshCw } from "lucide-react";

interface Props {
  vocab: VocabItem[];
  onComplete: () => void;
}

type Direction = "es_to_bs" | "bs_to_es";
type MicState = "idle" | "listening" | "correct" | "wrong";

interface CardEntry {
  word: VocabItem;
  direction: Direction;
  phase: "intro" | "quiz";
}

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z\s]/g, "")
    .trim();
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function fixConsecutive(all: CardEntry[]): CardEntry[] {
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

function buildSequence(vocab: VocabItem[]): CardEntry[] {
  // Phase 1: intro — all words once, Spanish → Bosnian, shuffled
  const intro: CardEntry[] = shuffle(
    vocab.map((word) => ({ word, direction: "es_to_bs" as Direction, phase: "intro" as const }))
  );

  // Phase 2: quiz — each word 5×, random direction, shuffled
  const quiz: CardEntry[] = [];
  for (const word of vocab) {
    for (let r = 0; r < 5; r++) {
      quiz.push({
        word,
        direction: Math.random() < 0.5 ? "es_to_bs" : "bs_to_es",
        phase: "quiz",
      });
    }
  }
  fixConsecutive(shuffle(quiz));

  return [...intro, ...quiz];
}

const BATCH = 10;

export default function VocabFlashcard({ vocab, onComplete }: Props) {
  const [sequence] = useState<CardEntry[]>(() => buildSequence(vocab));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [micState, setMicState] = useState<MicState>("idle");
  const [heard, setHeard] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recogRef = useRef<any>(null);
  const preloadedUpTo = useRef(-1);

  const entry = sequence[index];
  const { word, direction, phase } = entry;
  const isEsFirst = direction === "es_to_bs";
  const isIntro = phase === "intro";
  const introCount = vocab.length;

  const seenBefore = sequence.slice(0, index).some(
    (e) => e.word.es === word.es && e.direction === direction
  );

  // Preload TTS batch
  useEffect(() => {
    const batchStart = Math.floor(index / BATCH) * BATCH;
    if (batchStart <= preloadedUpTo.current) return;
    preloadedUpTo.current = batchStart + BATCH - 1;
    const batch = sequence.slice(batchStart, batchStart + BATCH);
    const texts = batch.flatMap((e) => [e.word.es, e.word.example_es].filter(Boolean));
    preloadTTS(texts);
  }, [index, sequence]);

  // Reset state when card changes
  useEffect(() => {
    setFlipped(false);
    setMicState("idle");
    setHeard("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const playCurrentSpanish = useCallback(() => {
    speak(word.es);
  }, [word.es]);

  const next = useCallback(() => {
    if (index < sequence.length - 1) {
      speak(sequence[index + 1].word.es);
      setIndex(index + 1);
    } else {
      onComplete();
    }
  }, [index, sequence, onComplete]);

  const prev = useCallback(() => {
    if (index > 0) {
      speak(sequence[index - 1].word.es);
      setIndex(index - 1);
    }
  }, [index, sequence]);

  // Auto-advance 1.5s after correct pronunciation
  useEffect(() => {
    if (micState === "correct") {
      const t = setTimeout(next, 1500);
      return () => clearTimeout(t);
    }
  }, [micState, next]);

  const startListening = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert("Tvoj browser ne podržava prepoznavanje govora. Koristi Chrome ili Brave.");
      return;
    }
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
        const match = results.some((r) => normalize(r) === correct || normalize(r).includes(correct));
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

  const totalCards = sequence.length;
  const progress = ((index + 1) / totalCards) * 100;
  const quizIndex = index - introCount;
  const isQuiz = phase === "quiz";

  return (
    <div className="flex flex-col min-h-[70vh]">
      {/* Progress */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
          {isIntro ? (
            <span>Uvod: {index + 1}/{introCount} · Španski → Bosanski</span>
          ) : (
            <span>Kviz: {quizIndex + 1}/{totalCards - introCount}</span>
          )}
          <span>{index + 1}/{totalCards}</span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex gap-2 mt-2">
          {isIntro ? (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
              📖 Uvod
            </span>
          ) : (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              isEsFirst
                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
            }`}>
              {isEsFirst ? "🇪🇸 Španski → Bosanski" : "🇧🇦 Bosanski → Španski"}
            </span>
          )}
        </div>
      </div>

      {/* Flip card */}
      <div
        className="h-[300px] cursor-pointer select-none"
        style={{ perspective: "1200px" }}
        onClick={() => setFlipped((f) => !f)}
      >
        <div
          style={{
            transformStyle: "preserve-3d",
            WebkitTransformStyle: "preserve-3d",
            transition: "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
            position: "relative",
            height: "100%",
          }}
        >
          {/* Front */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-8"
            style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
          >
            <div className="text-center space-y-2 w-full">
              <p className="text-xs text-gray-400 uppercase tracking-widest">
                {isEsFirst ? "Španski" : "Bosanski"}
              </p>
              <div className="flex items-center justify-center gap-3">
                <p className={`font-bold ${isEsFirst ? "text-5xl text-emerald-600 dark:text-emerald-400" : "text-4xl text-blue-600 dark:text-blue-400"}`}>
                  {isEsFirst ? word.es : word.bs}
                </p>
                <button
                  onClick={(e) => { e.stopPropagation(); playCurrentSpanish(); }}
                  className="p-2.5 rounded-full bg-emerald-500 text-white shadow-md hover:bg-emerald-600 active:scale-90 transition-all cursor-pointer flex-shrink-0"
                  aria-label="Izgovor"
                >
                  <Volume2 className="w-5 h-5" />
                </button>
              </div>
              {isEsFirst && word.ipa && (
                <p className="text-sm text-gray-400 font-mono">[{word.ipa}]</p>
              )}
              {/* Intro: always show translation. Quiz first time: show. Quiz repeat: must flip */}
              {(isIntro || !seenBefore) ? (
                <p className={`text-base font-medium pt-1 ${isEsFirst ? "text-gray-500 dark:text-gray-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                  {isEsFirst ? word.bs : word.es}
                </p>
              ) : (
                <p className="text-xs text-gray-400 pt-2">Tapni da vidiš {isEsFirst ? "prijevod" : "špansku riječ"}</p>
              )}
            </div>
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-8"
            style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            <div className="text-center space-y-4 w-full">
              <p className="text-xs text-gray-400 uppercase tracking-widest">
                {isEsFirst ? "Bosanski" : "Španski"}
              </p>
              <div className="flex items-center justify-center gap-3">
                <p className={`font-bold ${isEsFirst ? "text-3xl text-gray-800 dark:text-gray-100" : "text-4xl text-emerald-600 dark:text-emerald-400"}`}>
                  {isEsFirst ? word.bs : word.es}
                </p>
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
          </div>
        </div>
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
        {/* Back button */}
        <button
          onClick={prev}
          disabled={index === 0}
          className="w-12 h-14 rounded-2xl bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 flex items-center justify-center transition-all cursor-pointer"
          aria-label="Nazad"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Repeat button */}
        <button
          onClick={() => speak(word.es)}
          className="w-12 h-14 rounded-2xl bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition-all cursor-pointer"
          aria-label="Ponovi izgovor"
        >
          <RefreshCw className="w-5 h-5" />
        </button>

        {/* Mic button — only in quiz phase */}
        {isQuiz && (
          <button
            onClick={micState === "listening" ? stopListening : startListening}
            disabled={micState === "correct"}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow flex-shrink-0 cursor-pointer ${
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
        )}

        {/* Next button */}
        <button
          onClick={next}
          className="flex-1 h-14 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all text-base shadow cursor-pointer"
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
