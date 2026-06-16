import * as fs from "fs";
import * as path from "path";
import { LessonSchema, UnitTestSchema } from "@/types/lesson";
import type { Lesson, UnitTest } from "@/types/lesson";
import type { Curriculum } from "@/types/curriculum";

const CONTENT_DIR = path.join(process.cwd(), "content");

export function getCurriculum(): Curriculum {
  const raw = fs.readFileSync(path.join(CONTENT_DIR, "curriculum.json"), "utf-8");
  return JSON.parse(raw) as Curriculum;
}

export function getLesson(lessonId: string): Lesson | null {
  try {
    const parts = lessonId.split("-"); // ["a1","u1","l1"]
    const level = parts[0];
    const unit = parts[1];
    const filePath = path.join(
      CONTENT_DIR,
      "lessons",
      level,
      unit,
      `${lessonId}.json`
    );
    const raw = fs.readFileSync(filePath, "utf-8");
    const result = LessonSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function getUnitTest(testId: string): UnitTest | null {
  try {
    // e.g. "test-a1-u1" → tests/a1/u1.json
    const parts = testId.split("-"); // ["test","a1","u1"]
    const level = parts[1];
    const unit = parts[2];
    const filePath = path.join(CONTENT_DIR, "tests", level, `${unit}.json`);
    const raw = fs.readFileSync(filePath, "utf-8");
    const result = UnitTestSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function getAllLessonIds(): string[] {
  const curriculum = getCurriculum();
  return curriculum.levels.flatMap((l) =>
    l.units.flatMap((u) => u.lessons.map((lesson) => lesson.id))
  );
}
