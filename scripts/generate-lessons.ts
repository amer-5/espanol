#!/usr/bin/env tsx
import { config } from "dotenv";
config({ path: ".env.local" });
/**
 * Idempotent lesson + test generator.
 * Usage:
 *   pnpm seed:lessons            — skip existing, generate missing
 *   pnpm seed:lessons --force    — regenerate everything
 *   pnpm seed:lessons --only=a1  — only generate A1 lessons
 */

import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";
import { LessonSchema, UnitTestSchema } from "../src/types/lesson";
import type { Curriculum, Unit, LessonMeta } from "../src/types/curriculum";

const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY!,
  defaultHeaders: {
    "HTTP-Referer": "https://espanol.vercel.app",
    "X-Title": "Espanol - Spanish Learning App",
  },
});

// Override with SEED_MODEL env var, e.g. SEED_MODEL=google/gemma-3-27b-it:free
const MODEL = process.env.SEED_MODEL || "google/gemma-3-12b-it:free";

const CONTENT_DIR = path.join(process.cwd(), "content");
const LESSONS_DIR = path.join(CONTENT_DIR, "lessons");
const TESTS_DIR = path.join(CONTENT_DIR, "tests");

const args = process.argv.slice(2);
const FORCE = args.includes("--force");
const ONLY = args.find((a) => a.startsWith("--only="))?.split("=")[1];

const curriculum: Curriculum = JSON.parse(
  fs.readFileSync(path.join(CONTENT_DIR, "curriculum.json"), "utf-8")
);

// Load golden example lesson
const goldenLesson = fs.readFileSync(
  path.join(LESSONS_DIR, "a1/u1/a1-u1-l1.json"),
  "utf-8"
);

let generated = 0;
let skipped = 0;
let failed = 0;

// Build a map of all introduced vocabulary/grammar per lesson (for prerequisites tracking)
function getLessonPath(id: string): string {
  // e.g. "a1-u1-l1" → "content/lessons/a1/u1/a1-u1-l1.json"
  const parts = id.split("-"); // ["a1", "u1", "l1"]
  const level = parts[0];
  const unit = parts[1];
  return path.join(LESSONS_DIR, level, unit, `${id}.json`);
}

function getTestPath(id: string): string {
  // e.g. "test-a1-u1" → "content/tests/a1/u1.json"
  const parts = id.split("-"); // ["test", "a1", "u1"]
  const level = parts[1];
  const unit = parts[2];
  return path.join(TESTS_DIR, level, `${unit}.json`);
}

function fileExists(filePath: string): boolean {
  try {
    const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    return !!content.id; // valid non-empty JSON with an id
  } catch {
    return false;
  }
}

// Collect all lessons from earlier units to understand what's been introduced
function getPriorContent(
  currentLessonId: string,
  allUnits: Unit[]
): { vocabulary: string[]; grammar: string[] } {
  const vocabulary: string[] = [];
  const grammar: string[] = [];

  for (const unit of allUnits) {
    for (const lesson of unit.lessons) {
      if (lesson.id === currentLessonId) return { vocabulary, grammar };
      const lessonPath = getLessonPath(lesson.id);
      if (fs.existsSync(lessonPath)) {
        try {
          const data = JSON.parse(fs.readFileSync(lessonPath, "utf-8"));
          if (data.vocabulary) {
            vocabulary.push(...data.vocabulary.map((v: { es: string }) => v.es));
          }
          if (data.grammar) {
            grammar.push(...data.grammar.map((g: { concept: string }) => g.concept));
          }
        } catch {
          // ignore parse errors
        }
      }
    }
  }
  return { vocabulary, grammar };
}

const LESSON_SCHEMA_DESCRIPTION = `
JSON schema for a lesson (ALL fields required unless marked optional):
{
  id: string (e.g. "a1-u1-l2"),
  level: "A1" | "A2" | "B1",
  unit: number,
  lessonNumber: number,
  title: string (in Bosnian),
  subtitle: string (Spanish phrase),
  estimatedMinutes: number,
  objectives: string[] (2-4 items, in Bosnian),
  prerequisites: string[] (lesson IDs),
  vocabulary: Array of {
    es: string, bs: string, pos: string, ipa?: string,
    example_es: string, example_bs: string, illustrationRef?: string
  } (8-14 items),
  grammar: Array of {
    concept: string, explanation_bs: string,
    table?: { headers: string[], rows: string[][] },
    examples: Array<{es: string, bs: string}>,
    tips?: string
  } (1-2 items),
  dialogue: {
    title: string,
    lines: Array<{ speaker: string, es: string, bs: string }> (5-8 lines)
  },
  reading: {
    title: string, text_es: string,
    glossary: Array<{es: string, bs: string}>,
    comprehensionQuestions: Array<{
      question_bs: string, options: string[], answerIndex: number
    }> (2-3 questions)
  },
  exercises: Array (min 6, varied types: multiple_choice, fill_blank, translation, matching, listening, speaking),
  aiConversation: {
    enabled: boolean, scenario_bs: string, level: string,
    allowedGrammar: string[], systemPromptHint: string
  },
  illustration: { prompt: string, alt: string, filename: "cover.png" },
  review: { newWords: number, spacedRepetitionTags: string[] }
}
`;

const TEST_SCHEMA_DESCRIPTION = `
JSON schema for a unit test:
{
  id: string (e.g. "test-a1-u1"),
  level: "A1" | "A2" | "B1",
  unit: number,
  title: string (in Bosnian),
  cumulative: boolean (always true),
  timeLimitMinutes: number (12-20),
  passThreshold: 0.8,
  questions: Array (8-15 questions, mix of: translation bs_to_es, fill_blank, listening, multiple_choice, ONE writing task),
  reviewMapping: Array<{lessonId: string, topic: string}>
}
Each non-writing question has: type, points (1-4), lessonId.
The writing question has: gradedByAI: true, rubric_bs, minWords, points: 10.
`;

async function generateLesson(
  lessonMeta: LessonMeta,
  unit: Unit,
  allUnits: Unit[],
  attempt = 1
): Promise<boolean> {
  const priorContent = getPriorContent(lessonMeta.id, allUnits);

  const prompt = `You are an expert Spanish language teacher creating structured lesson content for Bosnian-speaking beginners.

Generate a complete lesson JSON for lesson ID "${lessonMeta.id}".

LESSON DETAILS:
- Title: ${lessonMeta.title}
- Unit: ${unit.id} - ${unit.title}
- Unit description: ${unit.description}
- Level: ${unit.level}
- Lesson number: ${lessonMeta.lessonNumber} in this unit
- Prerequisites (lesson IDs completed before): ${JSON.stringify(lessonMeta.prerequisites)}

STRICT RULES:
1. ALL explanations (explanation_bs, prompt_bs, question_bs, objectives, scenario_bs) MUST be in Bosnian language
2. Spanish examples must be correct and natural
3. Do NOT introduce vocabulary or grammar not yet covered by prior lessons
4. Already introduced vocabulary (do not re-teach as new): ${priorContent.vocabulary.slice(-50).join(", ")}
5. Already introduced grammar concepts: ${priorContent.grammar.slice(-20).join(", ")}
6. Include exactly 8-14 vocabulary items
7. Include 1-2 grammar concepts
8. Include at least 6 exercises with varied types
9. The dialogue should use ONLY vocabulary from this lesson + prerequisites
10. Reading text should be comprehensible with the introduced vocabulary

SCHEMA:
${LESSON_SCHEMA_DESCRIPTION}

GOLDEN EXAMPLE (match this quality and structure):
${goldenLesson}

Return ONLY valid JSON, no markdown code blocks, no explanations.`;

  try {
    const response = await client.chat.completions.create({
      model: MODEL,
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    });

    const rawText = response.choices[0]?.message?.content ?? "";

    // Extract JSON (handle potential markdown wrapping)
    let jsonStr = rawText.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(jsonStr);
    // Validate with Zod
    const result = LessonSchema.safeParse(parsed);
    if (!result.success) {
      if (attempt < 3) {
        console.warn(
          `  ⚠ Validation failed for ${lessonMeta.id} (attempt ${attempt}), retrying...`
        );
        console.warn("  Errors:", result.error.issues.slice(0, 3));
        return generateLesson(lessonMeta, unit, allUnits, attempt + 1);
      }
      console.error(
        `  ✗ ${lessonMeta.id} failed validation after 3 attempts`
      );
      failed++;
      return false;
    }

    // Save to file
    const filePath = getLessonPath(lessonMeta.id);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(result.data, null, 2));
    generated++;
    return true;
  } catch (err) {
    if (attempt < 3) {
      console.warn(
        `  ⚠ Error generating ${lessonMeta.id} (attempt ${attempt}), retrying...`
      );
      await new Promise((r) => setTimeout(r, 2000));
      return generateLesson(lessonMeta, unit, allUnits, attempt + 1);
    }
    console.error(`  ✗ ${lessonMeta.id} failed:`, err);
    failed++;
    return false;
  }
}

async function generateUnitTest(unit: Unit, attempt = 1): Promise<boolean> {
  // Load all lesson contents for this unit
  const lessonContents: string[] = [];
  for (const lesson of unit.lessons) {
    const lessonPath = getLessonPath(lesson.id);
    if (fs.existsSync(lessonPath)) {
      const content = fs.readFileSync(lessonPath, "utf-8");
      lessonContents.push(content);
    }
  }

  const prompt = `You are an expert Spanish language teacher creating a cumulative unit test for Bosnian-speaking learners.

Generate a unit test JSON for unit ${unit.id}: "${unit.title}" (Level: ${unit.level}).

The test is CUMULATIVE — it covers all lessons in this unit AND may include vocabulary/grammar from earlier units.

LESSONS IN THIS UNIT:
${lessonContents.join("\n\n---\n\n")}

TEST REQUIREMENTS:
- 8-15 questions total
- Mix: mostly bs_to_es translation and fill_blank (no hints), some listening, some multiple_choice
- EXACTLY ONE writing task (gradedByAI: true, 10 points) — free text 3-5 sentences
- No hints or options for fill_blank questions
- timeLimitMinutes: ${unit.level === "A1" ? 12 : unit.level === "A2" ? 15 : 20}
- passThreshold: 0.8
- Every question must have lessonId pointing to a lesson in this unit

SCHEMA:
${TEST_SCHEMA_DESCRIPTION}

Return ONLY valid JSON, no markdown, no explanations.`;

  try {
    const response = await client.chat.completions.create({
      model: MODEL,
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }],
    });

    const rawText = response.choices[0]?.message?.content ?? "";
    let jsonStr = rawText.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(jsonStr);
    const result = UnitTestSchema.safeParse(parsed);
    if (!result.success) {
      if (attempt < 3) {
        console.warn(
          `  ⚠ Test validation failed for ${unit.testId} (attempt ${attempt}), retrying...`
        );
        return generateUnitTest(unit, attempt + 1);
      }
      console.error(`  ✗ Test ${unit.testId} failed validation`);
      failed++;
      return false;
    }

    const filePath = getTestPath(unit.testId);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(result.data, null, 2));
    generated++;
    return true;
  } catch (err) {
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 2000));
      return generateUnitTest(unit, attempt + 1);
    }
    console.error(`  ✗ Test ${unit.testId} failed:`, err);
    failed++;
    return false;
  }
}

async function main() {
  console.log("🎓 Espanol — Lesson & Test Generator");
  console.log(`Mode: ${FORCE ? "FORCE regenerate all" : "Idempotent (skip existing)"}`);
  if (ONLY) console.log(`Filter: only ${ONLY.toUpperCase()}`);
  console.log("");

  const allUnits: Unit[] = curriculum.levels.flatMap((l) => l.units);
  let total = 0;

  for (const level of curriculum.levels) {
    if (ONLY && level.id.toLowerCase() !== ONLY.toLowerCase()) continue;

    for (const unit of level.units) {
      console.log(`\n📚 Unit ${unit.id}: ${unit.title}`);

      for (const lesson of unit.lessons) {
        total++;
        const lessonPath = getLessonPath(lesson.id);

        if (!FORCE && fileExists(lessonPath)) {
          console.log(`  [${total}/~72] ${lesson.id} ⏭ skipped`);
          skipped++;
          continue;
        }

        console.log(`  [${total}/~72] ${lesson.id} generating...`);
        await generateLesson(lesson, unit, allUnits);
        console.log(`  [${total}/~72] ${lesson.id} ✓`);

        // Rate limit buffer
        await new Promise((r) => setTimeout(r, 500));
      }

      // Generate unit test after all lessons in unit
      const testPath = getTestPath(unit.testId);
      if (!FORCE && fileExists(testPath)) {
        console.log(`  📝 ${unit.testId} ⏭ test skipped`);
        skipped++;
      } else {
        console.log(`  📝 ${unit.testId} generating test...`);
        await generateUnitTest(unit);
        console.log(`  📝 ${unit.testId} ✓`);
        await new Promise((r) => setTimeout(r, 500));
      }
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log(`✅ Generated: ${generated}`);
  console.log(`⏭ Skipped:   ${skipped}`);
  console.log(`❌ Failed:    ${failed}`);
  console.log("=".repeat(50));
}

main().catch(console.error);
