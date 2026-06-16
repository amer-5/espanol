export interface LessonMeta {
  id: string;
  title: string;
  lessonNumber: number;
  prerequisites: string[];
  estimatedMinutes: number;
}

export interface Unit {
  id: number;
  title: string;
  description: string;
  level: "A1" | "A2" | "B1";
  lessons: LessonMeta[];
  testId: string;
}

export interface Level {
  id: "A1" | "A2" | "B1";
  title: string;
  units: Unit[];
}

export interface Curriculum {
  levels: Level[];
}
