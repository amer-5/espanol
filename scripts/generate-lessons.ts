#!/usr/bin/env tsx
import { config } from "dotenv";
config({ path: ".env.local" });
/**
 * Lesson seeding script — uses any OpenAI-compatible endpoint.
 * Configure via .env.local:
 *   AI_BASE_URL=http://localhost:11434/v1   (Ollama)
 *   AI_API_KEY=ollama
 *   SEED_MODEL=llama3.1:8b
 *
 * Usage:
 *   pnpm seed:lessons
 *   pnpm seed:lessons --force
 *   pnpm seed:lessons --only=a1
 */

import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";
import { LessonSchema, UnitTestSchema } from "../src/types/lesson";
import type { Curriculum, Unit, LessonMeta } from "../src/types/curriculum";

const client = new OpenAI({
  baseURL: process.env.AI_BASE_URL || "http://localhost:11434/v1",
  apiKey: process.env.AI_API_KEY || "ollama",
});

const MODEL = process.env.SEED_MODEL || "llama3.1:8b";

const CONTENT_DIR = path.join(process.cwd(), "content");
const LESSONS_DIR = path.join(CONTENT_DIR, "lessons");
const TESTS_DIR = path.join(CONTENT_DIR, "tests");

const args = process.argv.slice(2);
const FORCE = args.includes("--force");
const ONLY = args.find((a) => a.startsWith("--only="))?.split("=")[1];

const curriculum: Curriculum = JSON.parse(
  fs.readFileSync(path.join(CONTENT_DIR, "curriculum.json"), "utf-8")
);

const goldenLesson = fs.readFileSync(
  path.join(LESSONS_DIR, "a1/u1/a1-u1-l1.json"),
  "utf-8"
);

let generated = 0, skipped = 0, failed = 0;

function getLessonPath(id: string): string {
  const [level, unit] = id.split("-");
  return path.join(LESSONS_DIR, level, unit, `${id}.json`);
}

function getTestPath(id: string): string {
  const parts = id.split("-"); // ["test","a1","u1"]
  return path.join(TESTS_DIR, parts[1], `${parts[2]}.json`);
}

function fileExists(p: string): boolean {
  try { return !!JSON.parse(fs.readFileSync(p, "utf-8")).id; } catch { return false; }
}

function getPriorContent(currentId: string, allUnits: Unit[]) {
  const vocabulary: string[] = [], grammar: string[] = [];
  for (const unit of allUnits) {
    for (const lesson of unit.lessons) {
      if (lesson.id === currentId) return { vocabulary, grammar };
      const p = getLessonPath(lesson.id);
      if (fs.existsSync(p)) {
        try {
          const d = JSON.parse(fs.readFileSync(p, "utf-8"));
          if (d.vocabulary) vocabulary.push(...d.vocabulary.map((v: {es: string}) => v.es));
          if (d.grammar) grammar.push(...d.grammar.map((g: {concept: string}) => g.concept));
        } catch { /**/ }
      }
    }
  }
  return { vocabulary, grammar };
}

const SCHEMA = `{"id","level","unit","lessonNumber","title","subtitle","estimatedMinutes","objectives":[],"prerequisites":[],"vocabulary":[{"es","bs","pos","ipa?","example_es","example_bs"}],"grammar":[{"concept","explanation_bs","table?":{"headers":[],"rows":[]},"examples":[{"es","bs"}],"tips?"}],"dialogue":{"title","lines":[{"speaker","es","bs"}]},"reading":{"title","text_es","glossary":[{"es","bs"}],"comprehensionQuestions":[{"question_bs","options":[],"answerIndex"}]},"exercises":[...],"aiConversation":{"enabled":true,"scenario_bs","level","allowedGrammar":[],"systemPromptHint"},"illustration":{"prompt","alt","filename":"cover.png"},"review":{"newWords","spacedRepetitionTags":[]}}`;

async function generateLesson(lessonMeta: LessonMeta, unit: Unit, allUnits: Unit[], attempt = 1): Promise<boolean> {
  const prior = getPriorContent(lessonMeta.id, allUnits);
  const prompt = `You are an expert Spanish teacher. Generate a complete JSON lesson for Bosnian-speaking beginners.

Lesson ID: ${lessonMeta.id}
Title: ${lessonMeta.title}
Unit ${unit.id}: ${unit.title} — ${unit.description}
Level: ${unit.level}, Lesson ${lessonMeta.lessonNumber}
Prerequisites: ${JSON.stringify(lessonMeta.prerequisites)}

RULES:
- ALL explanation_bs, prompt_bs, objectives, scenario_bs: MUST be in Bosnian
- 8-14 vocabulary items, 1-2 grammar concepts, min 6 exercises
- Do NOT introduce: ${prior.vocabulary.slice(-40).join(", ")}
- Exercise types needed: multiple_choice, fill_blank, translation, matching, listening, speaking

SCHEMA: ${SCHEMA}

EXAMPLE (match this quality): ${goldenLesson.slice(0, 2000)}

Return ONLY valid JSON.`;

  try {
    const r = await client.chat.completions.create({
      model: MODEL, max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    });
    let json = (r.choices[0]?.message?.content ?? "").trim()
      .replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "");
    const result = LessonSchema.safeParse(JSON.parse(json));
    if (!result.success) {
      if (attempt < 3) { console.warn(`  ⚠ Validation failed (${attempt}), retrying...`); return generateLesson(lessonMeta, unit, allUnits, attempt + 1); }
      console.error(`  ✗ ${lessonMeta.id} validation failed`); failed++; return false;
    }
    const p = getLessonPath(lessonMeta.id);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, JSON.stringify(result.data, null, 2));
    generated++; return true;
  } catch (err) {
    if (attempt < 3) { await new Promise(r => setTimeout(r, 2000)); return generateLesson(lessonMeta, unit, allUnits, attempt + 1); }
    console.error(`  ✗ ${lessonMeta.id}:`, String(err).slice(0, 120)); failed++; return false;
  }
}

async function generateUnitTest(unit: Unit, attempt = 1): Promise<boolean> {
  const lessons = unit.lessons.map(l => { try { return fs.readFileSync(getLessonPath(l.id), "utf-8"); } catch { return ""; } }).filter(Boolean);
  const prompt = `Generate a cumulative unit test JSON for unit ${unit.id} "${unit.title}" (${unit.level}).
timeLimitMinutes: ${unit.level === "A1" ? 12 : unit.level === "A2" ? 15 : 20}, passThreshold: 0.8
Include 8-12 questions: translation(bs_to_es), fill_blank(no hints), listening, multiple_choice, ONE writing(gradedByAI:true, 10 pts).
All prompt_bs in Bosnian. Each question has: type, points(1-4), lessonId.
Schema: {"id":"test-${unit.level.toLowerCase()}-u${unit.id}","level":"${unit.level}","unit":${unit.id},"title":"...","cumulative":true,"timeLimitMinutes":N,"passThreshold":0.8,"questions":[...],"reviewMapping":[{"lessonId","topic"}]}
Lessons context: ${lessons.join("---").slice(0, 3000)}
Return ONLY valid JSON.`;

  try {
    const r = await client.chat.completions.create({ model: MODEL, max_tokens: 3000, messages: [{ role: "user", content: prompt }] });
    let json = (r.choices[0]?.message?.content ?? "").trim().replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "");
    const result = UnitTestSchema.safeParse(JSON.parse(json));
    if (!result.success) {
      if (attempt < 3) return generateUnitTest(unit, attempt + 1);
      console.error(`  ✗ Test ${unit.testId} failed`); failed++; return false;
    }
    const p = getTestPath(unit.testId);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, JSON.stringify(result.data, null, 2));
    generated++; return true;
  } catch (err) {
    if (attempt < 3) { await new Promise(r => setTimeout(r, 2000)); return generateUnitTest(unit, attempt + 1); }
    console.error(`  ✗ Test ${unit.testId}:`, String(err).slice(0, 120)); failed++; return false;
  }
}

async function main() {
  console.log(`🎓 Lesson Generator — ${MODEL} @ ${process.env.AI_BASE_URL || "http://localhost:11434/v1"}`);
  const allUnits: Unit[] = curriculum.levels.flatMap(l => l.units);
  let total = 0;
  for (const level of curriculum.levels) {
    if (ONLY && level.id.toLowerCase() !== ONLY.toLowerCase()) continue;
    for (const unit of level.units) {
      console.log(`\n📚 Unit ${unit.id}: ${unit.title}`);
      for (const lesson of unit.lessons) {
        total++;
        const p = getLessonPath(lesson.id);
        if (!FORCE && fileExists(p)) { console.log(`  [${total}] ${lesson.id} ⏭`); skipped++; continue; }
        console.log(`  [${total}] ${lesson.id} generating...`);
        await generateLesson(lesson, unit, allUnits);
        console.log(`  [${total}] ${lesson.id} ✓`);
        await new Promise(r => setTimeout(r, 300));
      }
      const tp = getTestPath(unit.testId);
      if (!FORCE && fileExists(tp)) { console.log(`  📝 ${unit.testId} ⏭`); skipped++; }
      else { console.log(`  📝 ${unit.testId} generating...`); await generateUnitTest(unit); console.log(`  📝 ${unit.testId} ✓`); }
      await new Promise(r => setTimeout(r, 300));
    }
  }
  console.log(`\n✅ ${generated} generated  ⏭ ${skipped} skipped  ❌ ${failed} failed`);
}

main().catch(console.error);
