import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeAnswer(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[¿¡]/g, "")
    .replace(/[.,!?;:]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function checkAnswer(userAnswer: string, accepted: string[]): boolean {
  const norm = normalizeAnswer(userAnswer);
  return accepted.some((a) => normalizeAnswer(a) === norm);
}

/** SM-2 spaced repetition algorithm */
export function sm2(
  quality: number, // 0-5 rating
  repetitions: number,
  easeFactor: number,
  interval: number
): { repetitions: number; easeFactor: number; interval: number; dueDate: Date } {
  let newRepetitions = repetitions;
  let newEF = easeFactor;
  let newInterval = interval;

  if (quality >= 3) {
    if (repetitions === 0) newInterval = 1;
    else if (repetitions === 1) newInterval = 6;
    else newInterval = Math.round(interval * easeFactor);
    newRepetitions = repetitions + 1;
  } else {
    newRepetitions = 0;
    newInterval = 1;
  }

  newEF = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (newEF < 1.3) newEF = 1.3;

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + newInterval);

  return {
    repetitions: newRepetitions,
    easeFactor: newEF,
    interval: newInterval,
    dueDate,
  };
}

export function generateUserId(): string {
  return `anon_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}
