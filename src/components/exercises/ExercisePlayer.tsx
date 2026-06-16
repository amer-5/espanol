"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import type { Exercise } from "@/types/lesson";
import { checkAnswer } from "@/lib/utils";
import AudioButton from "@/components/ui/AudioButton";
import { Heart, CheckCircle2, XCircle, Mic, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExercisePlayerProps {
  exercises: Exercise[];
  onComplete: (score: number) => void;
}

// ─── Word Bank ────────────────────────────────────────────────────────────────
function WordBankExercise({
  ex,
  onAnswer,
}: {
  ex: Extract<Exercise, { type: "word_bank" }>;
  onAnswer: (ans: string) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [available, setAvailable] = useState<{ word: string; id: number }[]>(
    () => ex.words.map((w, i) => ({ word: w, id: i }))
  );

  const add = (item: { word: string; id: number }) => {
    setSelected((s) => [...s, item.word]);
    setAvailable((a) => a.filter((x) => x.id !== item.id));
  };

  const remove = (idx: number) => {
    const word = selected[idx];
    const origId = ex.words.findIndex(
      (w, i) => w === word && !available.find((a) => a.id === i)
    );
    setSelected((s) => s.filter((_, i) => i !== idx));
    setAvailable((a) => [...a, { word, id: origId }]);
  };

  const answer = selected.join(" ");

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">
        Prevedi na španski
      </p>
      <p className="text-xl font-bold text-gray-900 dark:text-white leading-snug">
        {ex.prompt_bs}
      </p>

      {/* Answer area */}
      <div className="min-h-14 flex flex-wrap gap-2 border-b-2 border-gray-300 dark:border-gray-600 pb-3">
        {selected.length === 0 && (
          <span className="text-gray-400 dark:text-gray-600 text-sm self-end">
            Tapni riječi da složiš odgovor...
          </span>
        )}
        {selected.map((w, i) => (
          <button
            key={i}
            onClick={() => remove(i)}
            className="px-3 py-1.5 bg-white dark:bg-gray-700 border-2 border-sky-400 rounded-xl text-sm font-medium text-gray-800 dark:text-gray-100 shadow-sm hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-all"
          >
            {w}
          </button>
        ))}
      </div>

      {/* Word bank */}
      <div className="flex flex-wrap gap-2">
        {available.map((item) => (
          <button
            key={item.id}
            onClick={() => add(item)}
            className="px-3 py-1.5 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-800 dark:text-gray-100 shadow-sm hover:border-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-all"
          >
            {item.word}
          </button>
        ))}
      </div>

      <button
        onClick={() => onAnswer(answer)}
        disabled={selected.length === 0}
        className={cn(
          "w-full py-4 rounded-2xl text-lg font-bold transition-all",
          selected.length > 0
            ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-md active:scale-[0.98]"
            : "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
        )}
      >
        PROVJERI
      </button>
    </div>
  );
}

// ─── Multiple Choice ──────────────────────────────────────────────────────────
function MultipleChoiceExercise({
  ex,
  onAnswer,
}: {
  ex: Extract<Exercise, { type: "multiple_choice" }>;
  onAnswer: (ans: string) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">
        Odaberi tačan odgovor
      </p>
      <p className="text-xl font-bold text-gray-900 dark:text-white leading-snug">
        {ex.prompt_bs}
      </p>
      <div className="grid gap-3">
        {ex.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => {
              setPicked(opt);
              setTimeout(() => onAnswer(opt), 200);
            }}
            className={cn(
              "p-4 rounded-2xl border-2 text-left text-base font-medium transition-all",
              picked === opt
                ? "border-sky-500 bg-sky-50 dark:bg-sky-900/30 text-sky-800 dark:text-sky-200"
                : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-sky-300 hover:bg-sky-50/50 dark:hover:bg-sky-900/20"
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Fill Blank ───────────────────────────────────────────────────────────────
function FillBlankExercise({
  ex,
  onAnswer,
}: {
  ex: Extract<Exercise, { type: "fill_blank" }>;
  onAnswer: (ans: string) => void;
}) {
  const [val, setVal] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">
        Dopuni rečenicu
      </p>
      <p className="text-xl font-bold text-gray-900 dark:text-white leading-snug">
        {ex.prompt_bs}
      </p>
      <input
        ref={inputRef}
        className="w-full border-2 border-gray-300 dark:border-gray-600 rounded-2xl px-4 py-3 text-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-sky-400 transition-colors"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && val.trim() && onAnswer(val.trim())}
        placeholder="Upiši odgovor..."
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />
      <button
        onClick={() => onAnswer(val.trim())}
        disabled={!val.trim()}
        className={cn(
          "w-full py-4 rounded-2xl text-lg font-bold transition-all",
          val.trim()
            ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-md active:scale-[0.98]"
            : "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
        )}
      >
        PROVJERI
      </button>
    </div>
  );
}

// ─── Translation ──────────────────────────────────────────────────────────────
function TranslationExercise({
  ex,
  onAnswer,
}: {
  ex: Extract<Exercise, { type: "translation" }>;
  onAnswer: (ans: string) => void;
}) {
  const [val, setVal] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">
        {ex.direction === "bs_to_es" ? "Prevedi na španski" : "Prevedi na bosanski"}
      </p>
      <div className="flex items-center gap-3">
        <p className="text-xl font-bold text-gray-900 dark:text-white leading-snug flex-1">
          {ex.prompt}
        </p>
        <AudioButton
          text={ex.prompt}
          lang={ex.direction === "es_to_bs" ? "es-ES" : "bs"}
          size="md"
        />
      </div>
      <textarea
        ref={inputRef}
        className="w-full border-2 border-gray-300 dark:border-gray-600 rounded-2xl px-4 py-3 text-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-sky-400 transition-colors resize-none"
        rows={2}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder="Prijevod..."
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />
      <button
        onClick={() => onAnswer(val.trim())}
        disabled={!val.trim()}
        className={cn(
          "w-full py-4 rounded-2xl text-lg font-bold transition-all",
          val.trim()
            ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-md active:scale-[0.98]"
            : "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
        )}
      >
        PROVJERI
      </button>
    </div>
  );
}

// ─── Listening ────────────────────────────────────────────────────────────────
function ListeningExercise({
  ex,
  onAnswer,
}: {
  ex: Extract<Exercise, { type: "listening" }>;
  onAnswer: (ans: string) => void;
}) {
  const [val, setVal] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">
        {ex.prompt_bs}
      </p>
      <div className="flex justify-center py-4">
        <AudioButton
          text={ex.audioText_es}
          size="md"
          className="w-20 h-20 rounded-full !bg-sky-500 hover:!bg-sky-600 shadow-xl"
        />
      </div>
      <input
        ref={inputRef}
        className="w-full border-2 border-gray-300 dark:border-gray-600 rounded-2xl px-4 py-3 text-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-sky-400 transition-colors"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && val.trim() && onAnswer(val.trim())}
        placeholder="Napiši što si čuo/la..."
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />
      <button
        onClick={() => onAnswer(val.trim())}
        disabled={!val.trim()}
        className={cn(
          "w-full py-4 rounded-2xl text-lg font-bold transition-all",
          val.trim()
            ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-md active:scale-[0.98]"
            : "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
        )}
      >
        PROVJERI
      </button>
    </div>
  );
}

// ─── Matching (tap pairs) ─────────────────────────────────────────────────────
function MatchingExercise({
  ex,
  onAnswer,
}: {
  ex: Extract<Exercise, { type: "matching" }>;
  onAnswer: (correct: boolean) => void;
}) {
  const [selectedEs, setSelectedEs] = useState<string | null>(null);
  const [matched, setMatched] = useState<Record<string, string>>({});
  const [wrong, setWrong] = useState<string | null>(null);
  const [bsOptions] = useState(() =>
    [...ex.pairs].sort(() => Math.random() - 0.5).map((p) => p.bs)
  );
  const done = ex.pairs.every((p) => matched[p.es] === p.bs);

  const pickBs = (bs: string) => {
    if (!selectedEs) return;
    const correct = ex.pairs.find((p) => p.es === selectedEs)?.bs === bs;
    if (correct) {
      setMatched((m) => ({ ...m, [selectedEs]: bs }));
      setSelectedEs(null);
      setWrong(null);
    } else {
      setWrong(bs);
      setTimeout(() => setWrong(null), 600);
      setSelectedEs(null);
    }
  };

  useEffect(() => {
    if (done) {
      setTimeout(() => onAnswer(true), 300);
    }
  }, [done, onAnswer]);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">
        {ex.prompt_bs}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          {ex.pairs.map((pair) => {
            const isMatched = !!matched[pair.es];
            return (
              <button
                key={pair.es}
                onClick={() => !isMatched && setSelectedEs(selectedEs === pair.es ? null : pair.es)}
                disabled={isMatched}
                className={cn(
                  "p-3 rounded-2xl border-2 text-sm font-medium text-left transition-all",
                  isMatched
                    ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 opacity-70"
                    : selectedEs === pair.es
                    ? "border-sky-500 bg-sky-50 dark:bg-sky-900/30 text-sky-800 dark:text-sky-200"
                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-sky-300"
                )}
              >
                {pair.es}
              </button>
            );
          })}
        </div>
        <div className="flex flex-col gap-2">
          {bsOptions.map((bs) => {
            const isMatched = Object.values(matched).includes(bs);
            return (
              <button
                key={bs}
                onClick={() => pickBs(bs)}
                disabled={isMatched}
                className={cn(
                  "p-3 rounded-2xl border-2 text-sm font-medium text-left transition-all",
                  isMatched
                    ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 opacity-70"
                    : wrong === bs
                    ? "border-red-400 bg-red-50 dark:bg-red-900/20 scale-95"
                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-sky-300"
                )}
              >
                {bs}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Speaking ─────────────────────────────────────────────────────────────────
function SpeakingExercise({
  ex,
  onDone,
}: {
  ex: Extract<Exercise, { type: "speaking" }>;
  onDone: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">
        Govori naglas
      </p>
      <p className="text-xl font-bold text-gray-900 dark:text-white leading-snug">
        {ex.prompt_bs}
      </p>
      <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4">
        <p className="text-xs text-gray-400 mb-2">Primjer odgovora:</p>
        <div className="flex items-start gap-2">
          <p className="text-base italic text-gray-700 dark:text-gray-300 flex-1">
            {ex.modelAnswer_es}
          </p>
          <AudioButton text={ex.modelAnswer_es} size="sm" />
        </div>
      </div>
      <button
        onClick={onDone}
        className="w-full py-4 rounded-2xl text-lg font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2"
      >
        <Mic className="w-5 h-5" />
        Rekao/la sam naglas
      </button>
    </div>
  );
}

// ─── Feedback panel ───────────────────────────────────────────────────────────
function FeedbackPanel({
  correct,
  correctAnswer,
  onContinue,
}: {
  correct: boolean;
  correctAnswer?: string;
  onContinue: () => void;
}) {
  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 px-4 pt-5 pb-8 border-t-2 transition-all",
        correct
          ? "bg-emerald-50 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-700"
          : "bg-red-50 dark:bg-red-950 border-red-300 dark:border-red-700"
      )}
    >
      <div className="max-w-lg mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {correct ? (
            <CheckCircle2 className="w-8 h-8 text-emerald-500 flex-shrink-0" />
          ) : (
            <XCircle className="w-8 h-8 text-red-500 flex-shrink-0" />
          )}
          <div>
            <p className={cn("font-bold text-lg", correct ? "text-emerald-700 dark:text-emerald-300" : "text-red-600 dark:text-red-400")}>
              {correct ? "Odlično!" : "Nije tačno"}
            </p>
            {!correct && correctAnswer && (
              <p className="text-sm text-red-600 dark:text-red-400">
                Tačno: <span className="font-semibold">{correctAnswer}</span>
              </p>
            )}
          </div>
        </div>
        <button
          onClick={onContinue}
          className={cn(
            "px-8 py-3 rounded-2xl font-bold text-base transition-all active:scale-[0.98]",
            correct
              ? "bg-emerald-500 hover:bg-emerald-600 text-white"
              : "bg-red-500 hover:bg-red-600 text-white"
          )}
        >
          NASTAVI
        </button>
      </div>
    </div>
  );
}

// ─── Main ExercisePlayer ──────────────────────────────────────────────────────
export default function ExercisePlayer({ exercises, onComplete }: ExercisePlayerProps) {
  const MAX_HEARTS = 3;
  const [current, setCurrent] = useState(0);
  const [hearts, setHearts] = useState(MAX_HEARTS);
  const [correctCount, setCorrectCount] = useState(0);
  const [feedback, setFeedback] = useState<{
    visible: boolean;
    correct: boolean;
    correctAnswer?: string;
  } | null>(null);

  const ex = exercises[current];
  const progress = current / exercises.length;

  const handleAnswer = useCallback(
    (userAnswer: string) => {
      let correct = false;
      let correctAnswer: string | undefined;

      if (ex.type === "multiple_choice") {
        correct = ex.options.indexOf(userAnswer) === ex.answerIndex;
        if (!correct) correctAnswer = ex.options[ex.answerIndex];
      } else if (ex.type === "fill_blank") {
        correct = checkAnswer(userAnswer, ex.acceptedAnswers);
        if (!correct) correctAnswer = ex.answer;
      } else if (ex.type === "translation") {
        correct = checkAnswer(userAnswer, ex.acceptedAnswers);
        if (!correct) correctAnswer = ex.answer;
      } else if (ex.type === "listening") {
        correct = checkAnswer(userAnswer, [ex.answer]);
        if (!correct) correctAnswer = ex.answer;
      } else if (ex.type === "word_bank") {
        correct = checkAnswer(userAnswer, [ex.answer_es]);
        if (!correct) correctAnswer = ex.answer_es;
      }

      if (correct) setCorrectCount((c) => c + 1);
      else setHearts((h) => Math.max(0, h - 1));

      setFeedback({ visible: true, correct, correctAnswer });
    },
    [ex]
  );

  const handleMatchingAnswer = useCallback(
    (correct: boolean) => {
      if (correct) setCorrectCount((c) => c + 1);
      else setHearts((h) => Math.max(0, h - 1));
      setFeedback({ visible: true, correct });
    },
    []
  );

  const advance = useCallback(() => {
    setFeedback(null);
    if (current + 1 >= exercises.length || hearts === 0) {
      const scored = exercises.filter(
        (e) => e.type !== "speaking" && e.type !== "matching"
      ).length;
      const score = Math.round((correctCount / Math.max(scored, 1)) * 100);
      onComplete(score);
    } else {
      setCurrent((c) => c + 1);
    }
  }, [current, exercises, hearts, correctCount, onComplete]);

  // Auto-advance for matching (already calls advance via onAnswer)
  const handleSpeakingDone = useCallback(() => {
    setCorrectCount((c) => c + 1);
    advance();
  }, [advance]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-gray-900/95 backdrop-blur border-b border-gray-100 dark:border-gray-800 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-4">
          {/* Progress bar */}
          <div className="flex-1 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          {/* Hearts */}
          <div className="flex gap-1">
            {Array.from({ length: MAX_HEARTS }).map((_, i) => (
              <Heart
                key={i}
                className={cn(
                  "w-5 h-5 transition-all",
                  i < hearts
                    ? "fill-red-500 text-red-500"
                    : "text-gray-300 dark:text-gray-600"
                )}
              />
            ))}
          </div>
          {/* Counter */}
          <span className="text-sm text-gray-400 tabular-nums">
            {current + 1}/{exercises.length}
          </span>
        </div>
      </div>

      {/* Exercise area */}
      <div className="flex-1 flex flex-col justify-center px-4 py-6 max-w-lg mx-auto w-full">
        <div className={cn("transition-opacity duration-200", feedback?.visible ? "opacity-0 pointer-events-none" : "opacity-100")}>
          {ex.type === "word_bank" && (
            <WordBankExercise ex={ex} onAnswer={handleAnswer} />
          )}
          {ex.type === "multiple_choice" && (
            <MultipleChoiceExercise ex={ex} onAnswer={handleAnswer} />
          )}
          {ex.type === "fill_blank" && (
            <FillBlankExercise ex={ex} onAnswer={handleAnswer} />
          )}
          {ex.type === "translation" && (
            <TranslationExercise ex={ex} onAnswer={handleAnswer} />
          )}
          {ex.type === "listening" && (
            <ListeningExercise ex={ex} onAnswer={handleAnswer} />
          )}
          {ex.type === "matching" && (
            <MatchingExercise ex={ex} onAnswer={handleMatchingAnswer} />
          )}
          {ex.type === "speaking" && (
            <SpeakingExercise ex={ex} onDone={handleSpeakingDone} />
          )}
          {ex.type === "tap_pairs" && (
            // Fallback — render as matching
            <MatchingExercise
              ex={{ ...ex, type: "matching" }}
              onAnswer={handleMatchingAnswer}
            />
          )}
        </div>
      </div>

      {/* Feedback panel */}
      {feedback?.visible && (
        <FeedbackPanel
          correct={feedback.correct}
          correctAnswer={feedback.correctAnswer}
          onContinue={advance}
        />
      )}
    </div>
  );
}
