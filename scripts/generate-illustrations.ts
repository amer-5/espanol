#!/usr/bin/env tsx
/**
 * Illustration generator using Google Gemini Image API (Nano Banana).
 * Usage:
 *   pnpm gen:illustrations           — skip existing
 *   pnpm gen:illustrations --force   — regenerate all
 *   pnpm gen:illustrations --only=a1 — only A1 lessons
 */

import * as fs from "fs";
import * as path from "path";
import { GoogleGenAI } from "@google/genai";

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const CONTENT_DIR = path.join(process.cwd(), "content");
const LESSONS_DIR = path.join(CONTENT_DIR, "lessons");
const PUBLIC_DIR = path.join(process.cwd(), "public", "illustrations");

const args = process.argv.slice(2);
const FORCE = args.includes("--force");
const ONLY = args.find((a) => a.startsWith("--only="))?.split("=")[1];

// Master style prompt for consistency across all illustrations
const MASTER_STYLE =
  "Flat vector illustration, warm friendly palette, soft rounded shapes, clean minimal background, consistent character design, modern educational app aesthetic, no text in image.";

// Fixed character descriptions for consistency
const CHARACTER_STYLES = {
  Ana: "young woman with dark shoulder-length hair, wearing a light blue blouse",
  Marko: "young man with short brown hair, wearing a casual green shirt",
  Sofía: "young woman with long wavy hair, wearing a yellow dress",
};

let generated = 0;
let skipped = 0;
let failed = 0;

function getLessonFiles(): Array<{ id: string; lessonPath: string }> {
  const result: Array<{ id: string; lessonPath: string }> = [];
  const levels = fs.readdirSync(LESSONS_DIR).filter((d) => {
    if (ONLY) return d === ONLY.toLowerCase();
    return true;
  });

  for (const level of levels) {
    const levelDir = path.join(LESSONS_DIR, level);
    if (!fs.statSync(levelDir).isDirectory()) continue;
    for (const unit of fs.readdirSync(levelDir)) {
      const unitDir = path.join(levelDir, unit);
      if (!fs.statSync(unitDir).isDirectory()) continue;
      for (const file of fs.readdirSync(unitDir)) {
        if (file.endsWith(".json")) {
          const lessonId = file.replace(".json", "");
          result.push({ id: lessonId, lessonPath: path.join(unitDir, file) });
        }
      }
    }
  }
  return result;
}

async function generateIllustration(
  lessonId: string,
  illustrationPrompt: string,
  filename: string,
  attempt = 1
): Promise<boolean> {
  const outputDir = path.join(PUBLIC_DIR, lessonId);
  const outputPath = path.join(outputDir, filename);

  if (!FORCE && fs.existsSync(outputPath)) {
    skipped++;
    return true;
  }

  const fullPrompt = `${MASTER_STYLE} ${illustrationPrompt}`;

  try {
    const response = await client.models.generateImages({
      model: "imagen-3.0-fast-generate-001",
      prompt: fullPrompt,
      config: {
        numberOfImages: 1,
        outputMimeType: "image/png",
        aspectRatio: "1:1",
      },
    });

    const imageData = response.generatedImages?.[0]?.image?.imageBytes;
    if (!imageData) throw new Error("No image data returned");

    fs.mkdirSync(outputDir, { recursive: true });
    const buffer = Buffer.from(imageData, "base64");
    fs.writeFileSync(outputPath, buffer);
    generated++;
    return true;
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    if (attempt < 3) {
      console.warn(`  ⚠ Retry ${attempt} for ${lessonId}/${filename}...`);
      await new Promise((r) => setTimeout(r, 3000));
      return generateIllustration(lessonId, illustrationPrompt, filename, attempt + 1);
    }
    console.error(`  ✗ Failed ${lessonId}/${filename}: ${errMsg}`);
    failed++;
    return false;
  }
}

async function main() {
  console.log("🎨 Espanol — Illustration Generator (Gemini Imagen)");
  console.log(`Mode: ${FORCE ? "FORCE regenerate all" : "Skip existing"}`);
  if (ONLY) console.log(`Filter: only ${ONLY.toUpperCase()}`);
  console.log("");

  const lessons = getLessonFiles();
  let total = 0;

  for (const { id, lessonPath } of lessons) {
    try {
      const lesson = JSON.parse(fs.readFileSync(lessonPath, "utf-8"));
      if (!lesson.illustration) continue;

      total++;

      // Enhance prompt with character descriptions if characters are mentioned
      let prompt = lesson.illustration.prompt as string;
      for (const [name, desc] of Object.entries(CHARACTER_STYLES)) {
        if (prompt.includes(name)) {
          prompt = prompt.replace(name, `${name} (${desc})`);
        }
      }

      const existing = path.join(PUBLIC_DIR, id, lesson.illustration.filename);
      if (!FORCE && fs.existsSync(existing)) {
        console.log(`  [${total}] ${id} ⏭ skipped`);
        skipped++;
        continue;
      }

      console.log(`  [${total}] ${id} generating...`);
      await generateIllustration(id, prompt, lesson.illustration.filename);
      console.log(`  [${total}] ${id} ✓`);

      // Polite rate limiting
      await new Promise((r) => setTimeout(r, 1000));
    } catch (err) {
      console.error(`  ✗ Error processing ${id}:`, err);
      failed++;
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log(`✅ Generated: ${generated}`);
  console.log(`⏭ Skipped:   ${skipped}`);
  console.log(`❌ Failed:    ${failed}`);
  console.log("=".repeat(50));
}

main().catch(console.error);
