"use client";

// Local progress storage (syncs to DB when user logs in)
const PROGRESS_KEY = "espanol_progress";
const USER_KEY = "espanol_user_id";

export interface LocalProgress {
  [lessonId: string]: {
    status: "locked" | "available" | "completed";
    score?: number;
    completedAt?: string;
  };
}

export function getUserId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(USER_KEY);
  if (!id) {
    id = `anon_${Math.random().toString(36).slice(2)}_${Date.now()}`;
    localStorage.setItem(USER_KEY, id);
  }
  return id;
}

export function getLocalProgress(): LocalProgress {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}");
  } catch {
    return {};
  }
}

export function setLessonStatus(
  lessonId: string,
  status: "locked" | "available" | "completed",
  score?: number
): void {
  if (typeof window === "undefined") return;
  const progress = getLocalProgress();
  progress[lessonId] = {
    status,
    score,
    completedAt: status === "completed" ? new Date().toISOString() : undefined,
  };
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

export function getLessonStatus(
  lessonId: string,
  prerequisites: string[]
): "locked" | "available" | "completed" {
  const progress = getLocalProgress();
  const current = progress[lessonId];

  if (current?.status === "completed") return "completed";

  // Check prerequisites
  const prereqsDone = prerequisites.every(
    (id) => progress[id]?.status === "completed"
  );

  if (prereqsDone || prerequisites.length === 0) return "available";
  return "locked";
}

// Test attempts in localStorage
const TEST_KEY = "espanol_tests";

export interface LocalTestAttempt {
  testId: string;
  score: number;
  passed: boolean;
  takenAt: string;
  attemptNumber: number;
}

export function getTestAttempts(testId: string): LocalTestAttempt[] {
  if (typeof window === "undefined") return [];
  try {
    const all = JSON.parse(localStorage.getItem(TEST_KEY) || "{}");
    return all[testId] || [];
  } catch {
    return [];
  }
}

export function saveTestAttempt(attempt: Omit<LocalTestAttempt, "attemptNumber">): void {
  if (typeof window === "undefined") return;
  try {
    const all = JSON.parse(localStorage.getItem(TEST_KEY) || "{}");
    const existing = all[attempt.testId] || [];
    all[attempt.testId] = [
      ...existing,
      { ...attempt, attemptNumber: existing.length + 1 },
    ];
    localStorage.setItem(TEST_KEY, JSON.stringify(all));
  } catch {
    // ignore
  }
}

// Streak tracking
const STREAK_KEY = "espanol_streak";

export function updateStreak(): { current: number; longest: number } {
  if (typeof window === "undefined") return { current: 0, longest: 0 };
  const today = new Date().toISOString().split("T")[0];
  try {
    const data = JSON.parse(
      localStorage.getItem(STREAK_KEY) || '{"current":0,"longest":0,"lastDate":""}'
    );
    if (data.lastDate === today) return { current: data.current, longest: data.longest };

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yest = yesterday.toISOString().split("T")[0];

    const newCurrent = data.lastDate === yest ? data.current + 1 : 1;
    const newLongest = Math.max(newCurrent, data.longest);
    const updated = { current: newCurrent, longest: newLongest, lastDate: today };
    localStorage.setItem(STREAK_KEY, JSON.stringify(updated));
    return { current: newCurrent, longest: newLongest };
  } catch {
    return { current: 1, longest: 1 };
  }
}

export function getStreak(): { current: number; longest: number } {
  if (typeof window === "undefined") return { current: 0, longest: 0 };
  try {
    const data = JSON.parse(
      localStorage.getItem(STREAK_KEY) || '{"current":0,"longest":0}'
    );
    return { current: data.current || 0, longest: data.longest || 0 };
  } catch {
    return { current: 0, longest: 0 };
  }
}
