"use client";
import { useState } from "react";
import type { Exercise } from "@/types/lesson";
import { checkAnswer } from "@/lib/utils";
import AudioButton from "@/components/ui/AudioButton";
import Button from "@/components/ui/Button";
import { CheckCircle, XCircle, Mic } from "lucide-react";

interface ExercisePlayerProps {
  exercises: Exercise[];
  onComplete: (score: number) => void;
}

interface ExerciseState {
  answer: string;
  submitted: boolean;
  correct: boolean | null;
  matchSelected: { [es: string]: string };
}

function MultipleChoice({
  ex,
  state,
  onSubmit,
}: {
  ex: Extract<Exercise, { type: "multiple_choice" }>;
  state: ExerciseState;
  onSubmit: (answer: string) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="font-medium text-gray-800 dark:text-gray-100">{ex.prompt_bs}</p>
      <div className="grid gap-2">
        {ex.options.map((opt, i) => {
          let cls =
            "p-3 rounded-xl border-2 text-left transition-all cursor-pointer text-base ";
          if (!state.submitted) {
            cls += state.answer === opt
              ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
              : "border-gray-200 dark:border-gray-600 hover:border-emerald-300";
          } else {
            if (i === ex.answerIndex) cls += "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200";
            else if (state.answer === opt && i !== ex.answerIndex)
              cls += "border-red-400 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200";
            else cls += "border-gray-200 dark:border-gray-600 opacity-60";
          }
          return (
            <button
              key={i}
              className={cls}
              onClick={() => !state.submitted && onSubmit(opt)}
              disabled={state.submitted}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {state.submitted && ex.explanation_bs && (
        <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
          💡 {ex.explanation_bs}
        </p>
      )}
    </div>
  );
}

function FillBlank({
  ex,
  state,
  onChange,
  onSubmit,
}: {
  ex: Extract<Exercise, { type: "fill_blank" }>;
  state: ExerciseState;
  onChange: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-3">
      <p className="font-medium text-gray-800 dark:text-gray-100">{ex.prompt_bs}</p>
      <input
        className="w-full border-2 rounded-xl px-4 py-3 text-base dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:border-emerald-400"
        value={state.answer}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && !state.submitted && onSubmit()}
        disabled={state.submitted}
        placeholder="Upiši odgovor..."
      />
      {state.submitted && (
        <p className={`text-sm font-medium ${state.correct ? "text-green-600" : "text-red-600"}`}>
          {state.correct ? "✓ Tačno!" : `✗ Tačan odgovor: ${ex.answer}`}
        </p>
      )}
    </div>
  );
}

function Translation({
  ex,
  state,
  onChange,
  onSubmit,
}: {
  ex: Extract<Exercise, { type: "translation" }>;
  state: ExerciseState;
  onChange: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
          {ex.direction === "bs_to_es" ? "BS → ES" : "ES → BS"}
        </span>
        <AudioButton text={ex.prompt} lang={ex.direction === "es_to_bs" ? "es-ES" : "bs"} size="sm" />
      </div>
      <p className="font-medium text-lg text-gray-800 dark:text-gray-100">{ex.prompt}</p>
      <textarea
        className="w-full border-2 rounded-xl px-4 py-3 text-base dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:border-emerald-400 resize-none"
        rows={2}
        value={state.answer}
        onChange={(e) => onChange(e.target.value)}
        disabled={state.submitted}
        placeholder="Prijevod..."
      />
      {state.submitted && (
        <div>
          <p className={`text-sm font-medium ${state.correct ? "text-green-600" : "text-red-500"}`}>
            {state.correct ? "✓ Tačno!" : `✗ Prijedlog: ${ex.answer}`}
          </p>
        </div>
      )}
    </div>
  );
}

function Matching({
  ex,
  state,
  onPairSelect,
  onSubmit,
}: {
  ex: Extract<Exercise, { type: "matching" }>;
  state: ExerciseState;
  onPairSelect: (es: string, bs: string) => void;
  onSubmit: () => void;
}) {
  const [selectedEs, setSelectedEs] = useState<string | null>(null);
  const matched = state.matchSelected;

  const shuffledBs = [...ex.pairs].sort(() => Math.random() - 0.5).map((p) => p.bs);
  // Keep stable reference
  const [bsOptions] = useState(shuffledBs);

  const handleEs = (es: string) => {
    if (state.submitted) return;
    setSelectedEs(selectedEs === es ? null : es);
  };

  const handleBs = (bs: string) => {
    if (!selectedEs || state.submitted) return;
    onPairSelect(selectedEs, bs);
    setSelectedEs(null);
  };

  const allMatched = ex.pairs.every((p) => matched[p.es]);

  return (
    <div className="space-y-3">
      <p className="font-medium text-gray-800 dark:text-gray-100">{ex.prompt_bs}</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          {ex.pairs.map((pair) => (
            <button
              key={pair.es}
              onClick={() => handleEs(pair.es)}
              className={`w-full p-2.5 rounded-xl border-2 text-left text-sm transition-all ${
                selectedEs === pair.es
                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30"
                  : matched[pair.es]
                  ? "border-green-400 bg-green-50 dark:bg-green-900/20 opacity-80"
                  : "border-gray-200 dark:border-gray-600 hover:border-gray-300"
              }`}
            >
              <span className="font-medium">{pair.es}</span>
              {matched[pair.es] && (
                <span className="block text-xs text-green-600">→ {matched[pair.es]}</span>
              )}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {bsOptions.map((bs) => {
            const isMatched = Object.values(matched).includes(bs);
            return (
              <button
                key={bs}
                onClick={() => handleBs(bs)}
                disabled={isMatched || state.submitted}
                className={`w-full p-2.5 rounded-xl border-2 text-left text-sm transition-all ${
                  isMatched
                    ? "border-green-400 bg-green-50 dark:bg-green-900/20 opacity-60"
                    : "border-gray-200 dark:border-gray-600 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                }`}
              >
                {bs}
              </button>
            );
          })}
        </div>
      </div>
      {allMatched && !state.submitted && (
        <Button onClick={onSubmit} className="w-full">
          Provjeri
        </Button>
      )}
      {state.submitted && (
        <div className="space-y-1">
          {ex.pairs.map((p) => {
            const ok = matched[p.es] === p.bs;
            return (
              <p key={p.es} className={`text-sm ${ok ? "text-green-600" : "text-red-500"}`}>
                {ok ? "✓" : "✗"} {p.es} = {p.bs}
              </p>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Listening({
  ex,
  state,
  onChange,
  onSubmit,
}: {
  ex: Extract<Exercise, { type: "listening" }>;
  state: ExerciseState;
  onChange: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-3">
      <p className="font-medium text-gray-800 dark:text-gray-100">{ex.prompt_bs}</p>
      <div className="flex justify-center">
        <AudioButton text={ex.audioText_es} size="md" className="!p-4 !rounded-2xl" />
      </div>
      <input
        className="w-full border-2 rounded-xl px-4 py-3 text-base dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:border-emerald-400"
        value={state.answer}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && !state.submitted && onSubmit()}
        disabled={state.submitted}
        placeholder="Napiši šta si čuo/la..."
      />
      {state.submitted && (
        <p className={`text-sm font-medium ${state.correct ? "text-green-600" : "text-red-500"}`}>
          {state.correct ? "✓ Tačno!" : `✗ Tačna rečenica: "${ex.answer}"`}
        </p>
      )}
    </div>
  );
}

function Speaking({ ex }: { ex: Extract<Exercise, { type: "speaking" }> }) {
  const [done, setDone] = useState(false);
  return (
    <div className="space-y-3">
      <p className="font-medium text-gray-800 dark:text-gray-100">{ex.prompt_bs}</p>
      <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Primjer odgovora:</p>
        <div className="flex items-center gap-2">
          <p className="text-base italic text-gray-700 dark:text-gray-200">{ex.modelAnswer_es}</p>
          <AudioButton text={ex.modelAnswer_es} size="sm" />
        </div>
      </div>
      <Button
        variant={done ? "success" : "primary"}
        onClick={() => setDone(true)}
        className="w-full gap-2"
      >
        <Mic className="w-4 h-4" />
        {done ? "✓ Odlično! Nastavi" : "Rekao/la sam naglas"}
      </Button>
    </div>
  );
}

export default function ExercisePlayer({ exercises, onComplete }: ExercisePlayerProps) {
  const [current, setCurrent] = useState(0);
  const [states, setStates] = useState<ExerciseState[]>(
    exercises.map(() => ({
      answer: "",
      submitted: false,
      correct: null,
      matchSelected: {},
    }))
  );
  const [correctCount, setCorrectCount] = useState(0);

  const ex = exercises[current];
  const state = states[current];

  const updateState = (patch: Partial<ExerciseState>) => {
    setStates((prev) => {
      const copy = [...prev];
      copy[current] = { ...copy[current], ...patch };
      return copy;
    });
  };

  const submitAnswer = (answer: string) => {
    let correct = false;
    if (ex.type === "multiple_choice") {
      correct = exercises[current] && ex.type === "multiple_choice"
        ? ex.options.indexOf(answer) === ex.answerIndex
        : false;
    } else if (ex.type === "fill_blank") {
      correct = checkAnswer(answer, ex.acceptedAnswers);
    } else if (ex.type === "translation") {
      correct = checkAnswer(answer, ex.acceptedAnswers);
    } else if (ex.type === "listening") {
      correct = checkAnswer(answer, [ex.answer]);
    }
    if (correct) setCorrectCount((c) => c + 1);
    updateState({ answer, submitted: true, correct });
  };

  const handleMatchSubmit = () => {
    const allCorrect = (ex as Extract<Exercise, { type: "matching" }>).pairs.every(
      (p) => state.matchSelected[p.es] === p.bs
    );
    if (allCorrect) setCorrectCount((c) => c + 1);
    updateState({ submitted: true, correct: allCorrect });
  };

  const next = () => {
    if (current + 1 >= exercises.length) {
      onComplete(Math.round((correctCount / exercises.filter(e => e.type !== "speaking").length) * 100));
    } else {
      setCurrent((c) => c + 1);
    }
  };

  const isLast = current + 1 >= exercises.length;

  const canAdvance =
    state.submitted ||
    ex.type === "speaking";

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <span>Vježba {current + 1} / {exercises.length}</span>
        <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all"
            style={{ width: `${((current + 1) / exercises.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Exercise */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 min-h-[200px]">
        {ex.type === "multiple_choice" && (
          <MultipleChoice
            ex={ex}
            state={state}
            onSubmit={(ans) => submitAnswer(ans)}
          />
        )}
        {ex.type === "fill_blank" && (
          <FillBlank
            ex={ex}
            state={state}
            onChange={(v) => updateState({ answer: v })}
            onSubmit={() => submitAnswer(state.answer)}
          />
        )}
        {ex.type === "translation" && (
          <Translation
            ex={ex}
            state={state}
            onChange={(v) => updateState({ answer: v })}
            onSubmit={() => submitAnswer(state.answer)}
          />
        )}
        {ex.type === "matching" && (
          <Matching
            ex={ex}
            state={state}
            onPairSelect={(es, bs) =>
              updateState({ matchSelected: { ...state.matchSelected, [es]: bs } })
            }
            onSubmit={handleMatchSubmit}
          />
        )}
        {ex.type === "listening" && (
          <Listening
            ex={ex}
            state={state}
            onChange={(v) => updateState({ answer: v })}
            onSubmit={() => submitAnswer(state.answer)}
          />
        )}
        {ex.type === "speaking" && <Speaking ex={ex} />}
      </div>

      {/* Submit / Next buttons */}
      <div className="flex gap-2">
        {!state.submitted && ex.type !== "speaking" && ex.type !== "multiple_choice" && ex.type !== "matching" && (
          <Button
            onClick={() => submitAnswer(state.answer)}
            className="flex-1"
            disabled={!state.answer.trim()}
          >
            Provjeri
          </Button>
        )}
        {canAdvance && (
          <Button
            variant={isLast ? "success" : "primary"}
            onClick={next}
            className="flex-1"
          >
            {isLast ? "Završi vježbe ✓" : "Sljedeća →"}
          </Button>
        )}
      </div>

      {/* Feedback indicator */}
      {state.submitted && state.correct !== null && ex.type !== "matching" && (
        <div
          className={`flex items-center gap-2 text-sm font-medium ${
            state.correct ? "text-green-600" : "text-red-500"
          }`}
        >
          {state.correct ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <XCircle className="w-4 h-4" />
          )}
          {state.correct ? "Tačno!" : "Nije tačno, ali nastavi!"}
        </div>
      )}
    </div>
  );
}
