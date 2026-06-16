"use client";
import { useState, useEffect } from "react";
import { getLocalProgress } from "@/lib/progress";
import { getCurriculum } from "@/lib/lessons";
import AudioButton from "@/components/ui/AudioButton";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Link from "next/link";
import { ChevronLeft, RotateCcw } from "lucide-react";
import type { Curriculum } from "@/types/curriculum";
import type { VocabItem } from "@/types/lesson";

interface SRSWord extends VocabItem {
  lessonId: string;
}

type Rating = 1 | 3 | 5;

export default function SRSPage() {
  const [words, setWords] = useState<SRSWord[]>([]);
  const [current, setCurrent] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWords();
  }, []);

  async function loadWords() {
    try {
      // Load curriculum and find completed lessons
      const res = await fetch("/api/lessons");
      const curriculum: Curriculum = await res.json();
      const progress = getLocalProgress();

      const completedLessons = curriculum.levels
        .flatMap((l) => l.units.flatMap((u) => u.lessons))
        .filter((l) => progress[l.id]?.status === "completed")
        .map((l) => l.id);

      // Load vocab from completed lessons
      const allWords: SRSWord[] = [];
      for (const lessonId of completedLessons.slice(-10)) { // last 10 lessons
        try {
          const lessonRes = await fetch(`/api/lessons/${lessonId}`);
          if (lessonRes.ok) {
            const lesson = await lessonRes.json();
            if (lesson.vocabulary) {
              allWords.push(...lesson.vocabulary.map((v: VocabItem) => ({
                ...v,
                lessonId,
              })));
            }
          }
        } catch {
          // skip
        }
      }

      // Shuffle and take up to 20
      const shuffled = allWords.sort(() => Math.random() - 0.5).slice(0, 20);
      setWords(shuffled);
    } catch {
      setWords([]);
    } finally {
      setLoading(false);
    }
  }

  const rate = (_rating: Rating) => {
    if (current + 1 >= words.length) {
      setDone(true);
    } else {
      setRevealed(false);
      setCurrent((c) => c + 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-3">🃏</div>
          <p className="text-gray-500 dark:text-gray-400">Učitavanje vokabulara...</p>
        </div>
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center px-4 text-center gap-4">
        <div className="text-5xl">📚</div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Nema vokabulara za ponavljanje</h1>
        <p className="text-gray-500 dark:text-gray-400">Završi neke lekcije da dobiješ kartice za ponavljanje!</p>
        <Link href="/" className="text-emerald-600 font-medium">← Idi na lekcije</Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center px-4 text-center gap-6">
        <div className="text-6xl">🎊</div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ponavljanje završeno!</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Pregledao/la si {words.length} kartica</p>
        </div>
        <Button onClick={() => { setCurrent(0); setDone(false); setRevealed(false); loadWords(); }} className="gap-2">
          <RotateCcw className="w-4 h-4" />
          Ponovi ponovo
        </Button>
        <Link href="/" className="text-gray-500 dark:text-gray-400 text-sm">← Nazad na lekcije</Link>
      </div>
    );
  }

  const word = words[current];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-lg mx-auto px-4">
        <div className="pt-4 pb-2">
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
            <ChevronLeft className="w-4 h-4" />
            Nazad
          </Link>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">Ponavljanje vokabulara</h1>
          <span className="text-sm text-gray-500 dark:text-gray-400">{current + 1} / {words.length}</span>
        </div>

        {/* Progress */}
        <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mb-6">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all"
            style={{ width: `${((current + 1) / words.length) * 100}%` }}
          />
        </div>

        {/* Flashcard */}
        <div className="min-h-[280px] flex flex-col items-center justify-center">
          <Card className="w-full text-center p-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <p className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">{word.es}</p>
              <AudioButton text={word.es} />
            </div>
            <p className="text-sm text-gray-400 dark:text-gray-500 italic mb-2">{word.pos}</p>
            {word.ipa && <p className="text-sm text-gray-400 font-mono mb-4">[{word.ipa}]</p>}

            {!revealed ? (
              <Button onClick={() => setRevealed(true)} variant="secondary" className="mt-4">
                Pokaži prijevod
              </Button>
            ) : (
              <div className="space-y-3">
                <p className="text-2xl font-semibold text-gray-800 dark:text-gray-100">{word.bs}</p>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3 text-left">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm italic text-gray-600 dark:text-gray-300">{word.example_es}</p>
                    <AudioButton text={word.example_es} size="sm" />
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{word.example_bs}</p>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Rating buttons */}
        {revealed && (
          <div className="mt-6 space-y-2">
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-3">Koliko ti je poznata ova riječ?</p>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => rate(1)}
                className="py-3 rounded-xl bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 font-medium text-sm hover:bg-red-200 dark:hover:bg-red-900/30 transition-colors"
              >
                😰 Teška
              </button>
              <button
                onClick={() => rate(3)}
                className="py-3 rounded-xl bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 font-medium text-sm hover:bg-amber-200 dark:hover:bg-amber-900/30 transition-colors"
              >
                🤔 OK
              </button>
              <button
                onClick={() => rate(5)}
                className="py-3 rounded-xl bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-medium text-sm hover:bg-green-200 dark:hover:bg-green-900/30 transition-colors"
              >
                😄 Laka
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
