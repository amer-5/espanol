"use client";
import { useState, useMemo } from "react";
import type { Lesson } from "@/types/lesson";
import AudioButton from "@/components/ui/AudioButton";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import ExercisePlayer from "@/components/exercises/ExercisePlayer";
import AIChat from "@/components/chat/AIChat";
import { setLessonStatus, updateStreak } from "@/lib/progress";
import { generateDuolingoSession } from "@/lib/duolingo";
import { Target, BookOpen, MessageSquare, FileText, Dumbbell, Bot, Award } from "lucide-react";
import Image from "next/image";

type Section =
  | "objectives"
  | "vocabulary"
  | "grammar"
  | "dialogue"
  | "reading"
  | "exercises"
  | "chat"
  | "summary";

const SECTIONS: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: "objectives", label: "Ciljevi", icon: Target },
  { id: "vocabulary", label: "Vokabular", icon: BookOpen },
  { id: "grammar", label: "Gramatika", icon: FileText },
  { id: "dialogue", label: "Dijalog", icon: MessageSquare },
  { id: "reading", label: "Tekst", icon: BookOpen },
  { id: "exercises", label: "Vježbe", icon: Dumbbell },
  { id: "chat", label: "AI Razgovor", icon: Bot },
  { id: "summary", label: "Sažetak", icon: Award },
];

export default function LessonPlayer({ lesson }: { lesson: Lesson }) {
  const [section, setSection] = useState<Section>("objectives");
  const [completedSections, setCompletedSections] = useState<Set<Section>>(new Set());
  const [exerciseScore, setExerciseScore] = useState<number | null>(null);

  // Generate Duolingo session once per lesson mount
  const duolingoExercises = useMemo(
    () => generateDuolingoSession(lesson.vocabulary, lesson.exercises),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lesson.id]
  );
  const [readingAnswers, setReadingAnswers] = useState<(number | null)[]>(
    lesson.reading.comprehensionQuestions.map(() => null)
  );

  const markSectionDone = (s: Section) => {
    setCompletedSections((prev) => new Set([...prev, s]));
  };

  const goNext = () => {
    const idx = SECTIONS.findIndex((s) => s.id === section);
    if (idx < SECTIONS.length - 1) {
      markSectionDone(section);
      setSection(SECTIONS[idx + 1].id);
    }
  };

  const completeLesson = () => {
    setLessonStatus(lesson.id, "completed", exerciseScore ?? 100);
    updateStreak();
    markSectionDone("summary");
  };

  const sectionIdx = SECTIONS.findIndex((s) => s.id === section);

  return (
    <div className="max-w-2xl mx-auto pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-gray-100 dark:border-gray-700 px-4 py-3">
        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
          {lesson.level} · Jedinica {lesson.unit} · Lekcija {lesson.lessonNumber}
        </p>
        <h1 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{lesson.title}</h1>
        {/* Section tabs */}
        <div className="flex gap-1 mt-2 overflow-x-auto scrollbar-hide pb-1">
          {SECTIONS.map((s, i) => {
            const Icon = s.icon;
            const done = completedSections.has(s.id);
            const active = s.id === section;
            return (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  active
                    ? "bg-emerald-500 text-white"
                    : done
                    ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                <Icon className="w-3 h-3" />
                <span className="hidden sm:inline">{s.label}</span>
                <span className="sm:hidden">{i + 1}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Objectives */}
        {section === "objectives" && (
          <div className="space-y-4">
            {lesson.illustration && (
              <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 max-h-48">
                <Image
                  src={`/illustrations/${lesson.id}/cover.png`}
                  alt={lesson.illustration.alt}
                  fill
                  className="object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
            )}
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 italic mb-2">{lesson.subtitle}</p>
              <h2 className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-2">Šta ćeš naučiti:</h2>
              <ul className="space-y-2">
                {lesson.objectives.map((obj, i) => (
                  <li key={i} className="flex items-start gap-2 text-gray-700 dark:text-gray-200">
                    <span className="text-emerald-500 mt-0.5">✓</span>
                    <span>{obj}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex gap-3 text-sm text-gray-500 dark:text-gray-400">
              <span>⏱ {lesson.estimatedMinutes} min</span>
              <span>📚 {lesson.review.newWords} novih riječi</span>
            </div>
            <Button onClick={goNext} className="w-full" size="lg">
              Počni lekciju →
            </Button>
          </div>
        )}

        {/* Vocabulary */}
        {section === "vocabulary" && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Vokabular</h2>
            {lesson.vocabulary.map((word, i) => (
              <Card key={i} className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                      {word.es}
                    </span>
                    <AudioButton text={word.es} size="sm" />
                    <span className="text-xs text-gray-400 italic">{word.pos}</span>
                    {word.ipa && (
                      <span className="text-xs text-gray-400 font-mono">[{word.ipa}]</span>
                    )}
                  </div>
                  <p className="text-gray-700 dark:text-gray-200 font-medium">{word.bs}</p>
                  <div className="mt-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm text-gray-600 dark:text-gray-300 italic">{word.example_es}</p>
                      <AudioButton text={word.example_es} size="sm" />
                    </div>
                    <p className="text-xs text-gray-400">{word.example_bs}</p>
                  </div>
                </div>
              </Card>
            ))}
            <Button onClick={goNext} className="w-full">Nastavi →</Button>
          </div>
        )}

        {/* Grammar */}
        {section === "grammar" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Gramatika</h2>
            {lesson.grammar.map((concept, i) => (
              <Card key={i} variant="highlighted">
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">{concept.concept}</h3>
                <p className="text-gray-700 dark:text-gray-200 text-sm mb-3">{concept.explanation_bs}</p>

                {concept.table && (
                  <div className="overflow-x-auto mb-3">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-emerald-100 dark:bg-emerald-900/30">
                          {concept.table.headers.map((h, hi) => (
                            <th key={hi} className="px-3 py-2 text-left font-semibold text-emerald-800 dark:text-emerald-200">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {concept.table.rows.map((row, ri) => (
                          <tr key={ri} className="border-t border-emerald-100 dark:border-emerald-800">
                            {row.map((cell, ci) => (
                              <td key={ci} className="px-3 py-2 text-gray-700 dark:text-gray-200">
                                {ci === 1 ? <span className="font-bold text-emerald-600">{cell}</span> : cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="space-y-2">
                  {concept.examples.map((ex, ei) => (
                    <div key={ei} className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg p-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-1">
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{ex.es}</p>
                          <AudioButton text={ex.es} size="sm" />
                        </div>
                        <p className="text-xs text-gray-500">{ex.bs}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {concept.tips && (
                  <div className="mt-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2 text-sm text-amber-800 dark:text-amber-200">
                    💡 {concept.tips}
                  </div>
                )}
              </Card>
            ))}
            <Button onClick={goNext} className="w-full">Nastavi →</Button>
          </div>
        )}

        {/* Dialogue */}
        {section === "dialogue" && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{lesson.dialogue.title}</h2>
            {lesson.dialogue.lines.map((line, i) => (
              <button
                key={i}
                onClick={() => {}}
                className="w-full text-left"
                aria-label={`Izgovor: ${line.es}`}
              >
                <Card className={`transition-all hover:shadow-md active:scale-[0.99] ${
                  i % 2 === 0 ? "" : "ml-4"
                }`}>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-xs font-bold text-emerald-700 dark:text-emerald-300 flex-shrink-0">
                      {line.speaker[0]}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">{line.speaker}</p>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-800 dark:text-gray-100">{line.es}</p>
                        <AudioButton text={line.es} size="sm" />
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 italic">{line.bs}</p>
                    </div>
                  </div>
                </Card>
              </button>
            ))}
            <Button onClick={goNext} className="w-full">Nastavi →</Button>
          </div>
        )}

        {/* Reading */}
        {section === "reading" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{lesson.reading.title}</h2>
            <Card variant="highlighted">
              <div className="flex items-start gap-2 mb-3">
                <p className="flex-1 text-gray-800 dark:text-gray-100 leading-relaxed">{lesson.reading.text_es}</p>
                <AudioButton text={lesson.reading.text_es} />
              </div>
              {lesson.reading.glossary.length > 0 && (
                <div className="border-t border-emerald-200 dark:border-emerald-700 pt-3">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Rječnik:</p>
                  <div className="flex flex-wrap gap-2">
                    {lesson.reading.glossary.map((g, i) => (
                      <span key={i} className="text-xs bg-white dark:bg-gray-700 rounded-lg px-2 py-1 text-gray-600 dark:text-gray-300">
                        <span className="font-medium text-emerald-600">{g.es}</span> = {g.bs}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            <h3 className="font-semibold text-gray-800 dark:text-gray-200">Pitanja razumijevanja:</h3>
            {lesson.reading.comprehensionQuestions.map((q, qi) => (
              <Card key={qi}>
                <p className="font-medium text-gray-800 dark:text-gray-100 mb-2">{q.question_bs}</p>
                <div className="space-y-2">
                  {q.options.map((opt, oi) => {
                    const selected = readingAnswers[qi] === oi;
                    const correct = readingAnswers[qi] !== null && oi === q.answerIndex;
                    const wrong = selected && oi !== q.answerIndex;
                    return (
                      <button
                        key={oi}
                        onClick={() => {
                          const copy = [...readingAnswers];
                          copy[qi] = oi;
                          setReadingAnswers(copy);
                        }}
                        disabled={readingAnswers[qi] !== null}
                        className={`w-full text-left p-2.5 rounded-xl border-2 text-sm transition-all ${
                          correct ? "border-green-500 bg-green-50 dark:bg-green-900/20" :
                          wrong ? "border-red-400 bg-red-50 dark:bg-red-900/20" :
                          selected ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20" :
                          "border-gray-200 dark:border-gray-600 hover:border-emerald-300"
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </Card>
            ))}
            <Button onClick={goNext} className="w-full">Nastavi na vježbe →</Button>
          </div>
        )}

        {/* Exercises */}
        {section === "exercises" && (
          <div className="-mx-4 -mt-4">
            <ExercisePlayer
              exercises={duolingoExercises}
              onComplete={(score) => {
                setExerciseScore(score);
                markSectionDone("exercises");
                setSection("chat");
              }}
            />
          </div>
        )}

        {/* AI Chat */}
        {section === "chat" && (
          <div>
            <AIChat config={lesson.aiConversation} />
            <Button onClick={goNext} className="w-full mt-4">
              Završi razgovor →
            </Button>
          </div>
        )}

        {/* Summary */}
        {section === "summary" && (
          <div className="text-center space-y-6 py-8">
            <div className="text-6xl">🎉</div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Lekcija završena!</h2>
              <p className="text-gray-500 dark:text-gray-400 mt-1">{lesson.title}</p>
            </div>
            {exerciseScore !== null && (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-4">
                <p className="text-3xl font-bold text-emerald-600">{exerciseScore}%</p>
                <p className="text-sm text-gray-500">rezultat vježbi</p>
              </div>
            )}
            <div className="text-left bg-gray-50 dark:bg-gray-800 rounded-2xl p-4">
              <p className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Naučio/la si:</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{lesson.review.newWords} novih španskih riječi</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {lesson.review.spacedRepetitionTags.map((tag) => (
                  <span key={tag} className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <Button onClick={completeLesson} className="w-full" size="lg">
              <Award className="w-5 h-5 mr-2" />
              Spremi progres i nastavi
            </Button>
            <Button
              variant="ghost"
              onClick={() => window.history.back()}
              className="w-full"
            >
              ← Nazad na mapu kursa
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
