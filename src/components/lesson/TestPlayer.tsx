"use client";
import { useState, useEffect, useRef } from "react";
import type { UnitTest, TestQuestion } from "@/types/lesson";
import { checkAnswer } from "@/lib/utils";
import AudioButton from "@/components/ui/AudioButton";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import ProgressBar from "@/components/ui/ProgressBar";
import { saveTestAttempt, setLessonStatus, getLocalProgress } from "@/lib/progress";
import { Timer, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

interface Answers {
  [qIndex: number]: string | number;
}

interface WritingGrade {
  score: number;
  feedback_bs: string;
  corrected_es: string;
}

export default function TestPlayer({ test }: { test: UnitTest }) {
  const [phase, setPhase] = useState<"intro" | "taking" | "grading" | "results">("intro");
  const [answers, setAnswers] = useState<Answers>({});
  const [timeLeft, setTimeLeft] = useState(test.timeLimitMinutes * 60);
  const [writingGrade, setWritingGrade] = useState<WritingGrade | null>(null);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [breakdown, setBreakdown] = useState<{ correct: boolean; points: number; earned: number }[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (phase === "taking") {
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            clearInterval(timerRef.current!);
            handleSubmit();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current!);
  }, [phase]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const handleSubmit = async () => {
    clearInterval(timerRef.current!);
    setPhase("grading");

    const breakdown: { correct: boolean; points: number; earned: number }[] = [];
    let totalPoints = 0;
    let earnedPoints = 0;

    for (let i = 0; i < test.questions.length; i++) {
      const q = test.questions[i];
      const ans = answers[i];
      totalPoints += q.points;

      if (q.type === "writing") {
        // Grade by AI
        let grade: WritingGrade = { score: 0, feedback_bs: "Nema odgovora.", corrected_es: "" };
        if (ans && String(ans).trim().split(" ").length >= q.minWords) {
          try {
            const res = await fetch("/api/grade", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                text: String(ans),
                rubric_bs: q.rubric_bs,
                maxPoints: q.points,
              }),
            });
            const data = await res.json();
            grade = data;
          } catch {
            grade = { score: Math.floor(q.points * 0.5), feedback_bs: "Greška pri ocjenjivanju.", corrected_es: String(ans) };
          }
        }
        setWritingGrade(grade);
        earnedPoints += grade.score;
        breakdown.push({ correct: grade.score >= q.points * 0.6, points: q.points, earned: grade.score });
      } else if (q.type === "multiple_choice") {
        const correct = ans === q.answerIndex;
        const earned = correct ? q.points : 0;
        earnedPoints += earned;
        breakdown.push({ correct, points: q.points, earned });
      } else if (q.type === "translation" || q.type === "fill_blank") {
        const correct = ans ? checkAnswer(String(ans), q.acceptedAnswers) : false;
        const earned = correct ? q.points : 0;
        earnedPoints += earned;
        breakdown.push({ correct, points: q.points, earned });
      } else if (q.type === "listening") {
        const correct = ans ? checkAnswer(String(ans), [q.answer]) : false;
        const earned = correct ? q.points : 0;
        earnedPoints += earned;
        breakdown.push({ correct, points: q.points, earned });
      }
    }

    const score = earnedPoints / totalPoints;
    setFinalScore(score);
    setBreakdown(breakdown);
    saveTestAttempt({ testId: test.id, score, passed: score >= test.passThreshold, takenAt: new Date().toISOString() });
    setPhase("results");
  };

  const currentQ = test.questions;

  return (
    <div className="max-w-2xl mx-auto px-4 pb-24">
      {/* Intro */}
      {phase === "intro" && (
        <div className="pt-8 space-y-6">
          <div className="text-center">
            <span className="text-5xl">📝</span>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-3">{test.title}</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Kumulativni test jedinice</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Card className="text-center">
              <p className="text-2xl font-bold text-emerald-600">⏱ {test.timeLimitMinutes}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">minuta</p>
            </Card>
            <Card className="text-center">
              <p className="text-2xl font-bold text-blue-600">80%</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">prag prolaza</p>
            </Card>
          </div>
          <Card variant="highlighted">
            <p className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Pravila testa:</p>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Objašnjenja se pokazuju tek nakon predaje</li>
              <li>• Nema nagovještaja kod fill-blank pitanja</li>
              <li>• Test nije moguće pauzirati</li>
              <li>• Zadatak pisanja ocjenjuje AI</li>
            </ul>
          </Card>
          <Button onClick={() => setPhase("taking")} className="w-full" size="lg">
            Počni test →
          </Button>
        </div>
      )}

      {/* Taking */}
      {phase === "taking" && (
        <div>
          {/* Sticky header */}
          <div className="sticky top-0 z-10 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{test.title}</span>
            <div className={`flex items-center gap-1.5 font-mono font-bold ${timeLeft < 120 ? "text-red-500" : "text-gray-600 dark:text-gray-300"}`}>
              <Timer className="w-4 h-4" />
              {formatTime(timeLeft)}
            </div>
          </div>

          <div className="pt-4 space-y-6">
            {test.questions.map((q, i) => (
              <QuestionView
                key={i}
                question={q}
                index={i}
                answer={answers[i]}
                onAnswer={(v) => setAnswers((prev) => ({ ...prev, [i]: v }))}
              />
            ))}

            <Button onClick={handleSubmit} className="w-full" size="lg" variant="danger">
              Predaj test
            </Button>
          </div>
        </div>
      )}

      {/* Grading */}
      {phase === "grading" && (
        <div className="flex flex-col items-center justify-center min-h-64 py-16">
          <div className="animate-spin text-4xl mb-4">⚙️</div>
          <p className="text-gray-600 dark:text-gray-400">Ocjenjivanje testa...</p>
        </div>
      )}

      {/* Results */}
      {phase === "results" && finalScore !== null && (
        <Results
          test={test}
          score={finalScore}
          breakdown={breakdown}
          writingGrade={writingGrade}
        />
      )}
    </div>
  );
}

function QuestionView({
  question,
  index,
  answer,
  onAnswer,
}: {
  question: TestQuestion;
  index: number;
  answer: string | number | undefined;
  onAnswer: (v: string | number) => void;
}) {
  const q = question;
  return (
    <Card>
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Pitanje {index + 1} · {q.points} {q.points === 1 ? "bod" : "bodova"}</p>

      {q.type === "translation" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded font-medium">
              {q.direction === "bs_to_es" ? "BS → ES" : "ES → BS"}
            </span>
            <AudioButton text={q.prompt} lang={q.direction === "es_to_bs" ? "es-ES" : "bs"} size="sm" />
          </div>
          <p className="font-medium text-gray-800 dark:text-gray-100">{q.prompt}</p>
          <textarea
            className="w-full border-2 rounded-xl px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:border-emerald-400 resize-none"
            rows={2}
            value={String(answer ?? "")}
            onChange={(e) => onAnswer(e.target.value)}
            placeholder="Prijevod..."
          />
        </div>
      )}

      {q.type === "fill_blank" && (
        <div className="space-y-2">
          <p className="font-medium text-gray-800 dark:text-gray-100">{q.prompt_bs}</p>
          <input
            className="w-full border-2 rounded-xl px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:border-emerald-400"
            value={String(answer ?? "")}
            onChange={(e) => onAnswer(e.target.value)}
            placeholder="Upiši odgovor (bez nagovještaja)..."
          />
        </div>
      )}

      {q.type === "listening" && (
        <div className="space-y-2">
          <p className="font-medium text-gray-800 dark:text-gray-100">{q.prompt_bs}</p>
          <div className="flex justify-center">
            <AudioButton text={q.audioText_es} className="!p-4 !rounded-2xl" />
          </div>
          <input
            className="w-full border-2 rounded-xl px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:border-emerald-400"
            value={String(answer ?? "")}
            onChange={(e) => onAnswer(e.target.value)}
            placeholder="Napiši šta si čuo/la..."
          />
        </div>
      )}

      {q.type === "multiple_choice" && (
        <div className="space-y-2">
          <p className="font-medium text-gray-800 dark:text-gray-100">{q.prompt_bs}</p>
          <div className="grid gap-2">
            {q.options.map((opt, oi) => (
              <button
                key={oi}
                onClick={() => onAnswer(oi)}
                className={`p-2.5 rounded-xl border-2 text-left text-sm transition-all ${
                  answer === oi
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                    : "border-gray-200 dark:border-gray-600 hover:border-emerald-300"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {q.type === "writing" && (
        <div className="space-y-2">
          <p className="font-medium text-gray-800 dark:text-gray-100">{q.prompt_bs}</p>
          <p className="text-xs text-gray-400">Minimum {q.minWords} riječi · Ocjenjuje AI</p>
          <textarea
            className="w-full border-2 rounded-xl px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:border-emerald-400 resize-none"
            rows={5}
            value={String(answer ?? "")}
            onChange={(e) => onAnswer(e.target.value)}
            placeholder="Piši na španskom..."
          />
          <p className="text-xs text-gray-400">
            {String(answer ?? "").trim().split(/\s+/).filter(Boolean).length} / {q.minWords} riječi
          </p>
        </div>
      )}
    </Card>
  );
}

function Results({
  test,
  score,
  breakdown,
  writingGrade,
}: {
  test: UnitTest;
  score: number;
  breakdown: { correct: boolean; points: number; earned: number }[];
  writingGrade: WritingGrade | null;
}) {
  const passed = score >= test.passThreshold;
  const pct = Math.round(score * 100);
  const totalPoints = test.questions.reduce((s, q) => s + q.points, 0);
  const earnedPoints = breakdown.reduce((s, b) => s + b.earned, 0);

  // Find lessons to review (questions answered wrong)
  const toReview = test.reviewMapping.filter((_, i) => {
    const b = breakdown[i];
    return b && !b.correct;
  });

  return (
    <div className="pt-8 space-y-6">
      <div className="text-center">
        <div className="text-6xl mb-3">{passed ? "🏆" : "📖"}</div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {passed ? "Test položen!" : "Pokušaj ponovo"}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">{test.title}</p>
      </div>

      <Card variant={passed ? "success" : "error"}>
        <div className="text-center">
          <p className="text-4xl font-bold">{pct}%</p>
          <p className="text-sm mt-1">{earnedPoints} / {totalPoints} bodova</p>
          <ProgressBar
            value={pct}
            color={passed ? "emerald" : "amber"}
            className="mt-3"
          />
          <p className="text-xs mt-2 text-gray-500">
            Prag prolaza: {Math.round(test.passThreshold * 100)}%
          </p>
        </div>
      </Card>

      {/* Writing feedback */}
      {writingGrade && (
        <Card>
          <p className="font-semibold text-gray-800 dark:text-gray-200 mb-2">💬 AI ocjena pisanja</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{writingGrade.feedback_bs}</p>
          {writingGrade.corrected_es && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Ispravljena verzija:</p>
              <p className="text-sm italic text-gray-700 dark:text-gray-200">{writingGrade.corrected_es}</p>
            </div>
          )}
        </Card>
      )}

      {/* Breakdown */}
      <div>
        <p className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Pregled odgovora:</p>
        <div className="space-y-2">
          {test.questions.map((q, i) => {
            const b = breakdown[i];
            if (!b) return null;
            return (
              <div key={i} className="flex items-center gap-2 text-sm">
                {b.correct
                  ? <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  : <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                }
                <span className="flex-1 text-gray-600 dark:text-gray-400 truncate">
                  Pitanje {i + 1} ({q.type})
                </span>
                <span className="font-medium">{b.earned}/{b.points}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Review suggestions on fail */}
      {!passed && toReview.length > 0 && (
        <Card variant="error">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-700 dark:text-red-300 mb-2">Preporučamo ponavljanje:</p>
              {toReview.map((item, i) => (
                <div key={i} className="text-sm text-gray-600 dark:text-gray-400">
                  • {item.topic}
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {passed ? (
          <Button
            className="w-full"
            size="lg"
            onClick={() => window.location.href = "/"}
          >
            🎉 Nastavi učenje →
          </Button>
        ) : (
          <Button
            className="w-full"
            size="lg"
            onClick={() => window.location.reload()}
          >
            Pokušaj test ponovo
          </Button>
        )}
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => window.location.href = "/"}
        >
          ← Nazad na mapu kursa
        </Button>
      </div>
    </div>
  );
}
