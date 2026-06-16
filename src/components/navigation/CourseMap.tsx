"use client";
import { useState, useEffect } from "react";
import type { Curriculum } from "@/types/curriculum";
import { getLocalProgress } from "@/lib/progress";
import ProgressBar from "@/components/ui/ProgressBar";
import { Lock, CheckCircle, BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";

export default function CourseMap({ curriculum }: { curriculum: Curriculum }) {
  const [progress, setProgress] = useState<Record<string, { status: string }>>({});
  const [openLevel, setOpenLevel] = useState<string>("A1");

  useEffect(() => {
    setProgress(getLocalProgress());
  }, []);

  const totalLessons = curriculum.levels.flatMap((l) =>
    l.units.flatMap((u) => u.lessons)
  ).length;

  const completedCount = Object.values(progress).filter(
    (p) => p.status === "completed"
  ).length;

  return (
    <div className="max-w-2xl mx-auto px-4 pb-24">
      {/* Overall progress */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="font-semibold text-gray-800 dark:text-gray-200">Ukupni napredak</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {completedCount} / {totalLessons} lekcija
          </span>
        </div>
        <ProgressBar value={(completedCount / totalLessons) * 100} />
      </div>

      {/* Levels */}
      {curriculum.levels.map((level) => {
        const levelLessons = level.units.flatMap((u) => u.lessons);
        const levelCompleted = levelLessons.filter(
          (l) => progress[l.id]?.status === "completed"
        ).length;
        const isOpen = openLevel === level.id;

        return (
          <div key={level.id} className="mb-4">
            <button
              onClick={() => setOpenLevel(isOpen ? "" : level.id)}
              className="w-full flex items-center justify-between bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-2xl px-4 py-3 font-bold shadow-sm"
            >
              <div className="text-left">
                <p className="text-lg">{level.id}</p>
                <p className="text-sm font-normal opacity-90">{level.title}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-normal opacity-90">
                  {levelCompleted}/{levelLessons.length}
                </span>
                {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
            </button>

            {isOpen && (
              <div className="mt-2 space-y-2 pl-2">
                {level.units.map((unit) => {
                  const unitCompleted = unit.lessons.filter(
                    (l) => progress[l.id]?.status === "completed"
                  ).length;
                  const unitPct = (unitCompleted / unit.lessons.length) * 100;

                  return (
                    <div key={unit.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
                              Jedinica {unit.id}: {unit.title.replace(/^U\d+ — /, "")}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                              {unit.description}
                            </p>
                          </div>
                          <span className="text-xs text-gray-400 dark:text-gray-500 ml-2 flex-shrink-0">
                            {unitCompleted}/{unit.lessons.length}
                          </span>
                        </div>
                        <ProgressBar value={unitPct} className="mt-2" />
                      </div>

                      {/* Lessons */}
                      <div className="divide-y divide-gray-50 dark:divide-gray-700">
                        {unit.lessons.map((lesson) => {
                          const lessonProgress = progress[lesson.id];
                          const isCompleted = lessonProgress?.status === "completed";
                          const isAvailable =
                            lesson.prerequisites.every(
                              (id) => progress[id]?.status === "completed"
                            ) || lesson.prerequisites.length === 0;
                          const isLocked = !isCompleted && !isAvailable;

                          return (
                            <div key={lesson.id}>
                              {isLocked ? (
                                <div className="flex items-center gap-3 px-4 py-3 opacity-50">
                                  <Lock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                  <div className="flex-1">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                      {lesson.title}
                                    </p>
                                  </div>
                                  <span className="text-xs text-gray-400">{lesson.estimatedMinutes}m</span>
                                </div>
                              ) : (
                                <Link
                                  href={`/lesson/${lesson.id}`}
                                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                >
                                  {isCompleted ? (
                                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                  ) : (
                                    <BookOpen className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                  )}
                                  <div className="flex-1">
                                    <p className={`text-sm font-medium ${
                                      isCompleted
                                        ? "text-gray-500 dark:text-gray-400"
                                        : "text-gray-800 dark:text-gray-100"
                                    }`}>
                                      {lesson.lessonNumber}. {lesson.title}
                                    </p>
                                  </div>
                                  <span className="text-xs text-gray-400">{lesson.estimatedMinutes}m</span>
                                </Link>
                              )}
                            </div>
                          );
                        })}

                        {/* Test link */}
                        {unitCompleted === unit.lessons.length && (
                          <Link
                            href={`/test/${unit.testId}`}
                            className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/10 hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-colors"
                          >
                            <span className="text-lg">📝</span>
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                                Test jedinice {unit.id}
                              </p>
                            </div>
                            <ChevronDown className="w-4 h-4 text-amber-500 rotate-[-90deg]" />
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
