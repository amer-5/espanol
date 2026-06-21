import {
  pgTable,
  text,
  timestamp,
  integer,
  real,
  boolean,
  jsonb,
  serial,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(), // uuid or anon id
  email: text("email"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const progress = pgTable(
  "progress",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lessonId: text("lesson_id").notNull(),
    status: text("status").notNull().default("locked"), // locked | available | completed
    score: real("score"),
    completedAt: timestamp("completed_at"),
  },
  (t) => [uniqueIndex("progress_user_lesson_idx").on(t.userId, t.lessonId)]
);

export const vocabSrs = pgTable("vocab_srs", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  wordEs: text("word_es").notNull(),
  lessonId: text("lesson_id").notNull(),
  easeFactor: real("ease_factor").notNull().default(2.5),
  interval: integer("interval").notNull().default(1), // days
  dueDate: timestamp("due_date").defaultNow().notNull(),
  repetitions: integer("repetitions").notNull().default(0),
});

export const streaks = pgTable("streaks", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  lastActiveDate: text("last_active_date"), // ISO date string YYYY-MM-DD
});

export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  selectedText: text("selected_text").notNull(),
  translation: text("translation"),
  lessonId: text("lesson_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const testAttempts = pgTable("test_attempts", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  testId: text("test_id").notNull(),
  unit: integer("unit").notNull(),
  score: real("score").notNull(),
  passed: boolean("passed").notNull(),
  answers: jsonb("answers"),
  attemptNumber: integer("attempt_number").notNull().default(1),
  takenAt: timestamp("taken_at").defaultNow().notNull(),
});
