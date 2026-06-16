#!/usr/bin/env tsx
import { config } from "dotenv";
config({ path: ".env.local" });
/**
 * Illustration generator using Pollinations.ai (free, no API key needed).
 * Usage:
 *   pnpm gen:illustrations           — skip existing
 *   pnpm gen:illustrations --force   — regenerate all
 *   pnpm gen:illustrations --only=a1 — only A1 lessons
 */

import * as fs from "fs";
import * as path from "path";

const CONTENT_DIR = path.join(process.cwd(), "content");
const LESSONS_DIR = path.join(CONTENT_DIR, "lessons");
const PUBLIC_DIR = path.join(process.cwd(), "public", "illustrations");

const args = process.argv.slice(2);
const FORCE = args.includes("--force");
const ONLY = args.find((a) => a.startsWith("--only="))?.split("=")[1];

const MASTER_STYLE =
  "flat vector illustration, warm friendly palette, soft rounded shapes, clean minimal background, consistent character design, modern educational app aesthetic, no text";

const CHARACTER_STYLES: Record<string, string> = {
  Ana: "young woman dark shoulder-length hair light blue blouse",
  Marko: "young man short brown hair casual green shirt",
  Sofía: "young woman long wavy hair yellow dress",
};

let generated = 0;
let skipped = 0;
let failed = 0;

function getLessonFiles(): Array<{ id: string; lessonPath: string }> {
  const result: Array<{ id: string; lessonPath: string }> = [];
  if (!fs.existsSync(LESSONS_DIR)) return result;

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
          result.push({
            id: file.replace(".json", ""),
            lessonPath: path.join(unitDir, file),
          });
        }
      }
    }
  }
  return result;
}

async function downloadImage(
  prompt: string,
  outputPath: string,
  attempt = 1
): Promise<boolean> {
  const encoded = encodeURIComponent(prompt);
  const url = `https://image.pollinations.ai/prompt/${encoded}?width=512&height=512&model=flux&nologo=true&seed=${Math.floor(Math.random() * 9999)}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const arrayBuffer = await res.arrayBuffer();
    fs.writeFileSync(outputPath, Buffer.from(arrayBuffer));
    return true;
  } catch (err) {
    if (attempt < 3) {
      console.warn(`  ⚠ Retry ${attempt}...`);
      await new Promise((r) => setTimeout(r, 3000 * attempt));
      return downloadImage(prompt, outputPath, attempt + 1);
    }
    console.error(`  ✗ Failed: ${err}`);
    return false;
  }
}

async function main() {
  console.log("🎨 Illustration Generator — Pollinations.ai (free, no key)");
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
      const outputDir = path.join(PUBLIC_DIR, id);
      const outputPath = path.join(outputDir, lesson.illustration.filename);

      if (!FORCE && fs.existsSync(outputPath)) {
        console.log(`  [${total}] ${id} ⏭ skipped`);
        skipped++;
        continue;
      }

      // Inject character descriptions if names appear in prompt
      let prompt = lesson.illustration.prompt as string;
      for (const [name, desc] of Object.entries(CHARACTER_STYLES)) {
        if (prompt.includes(name)) {
          prompt = prompt.replace(name, `${name} (${desc})`);
        }
      }
      const fullPrompt = `${MASTER_STYLE}, ${prompt}`;

      console.log(`  [${total}] ${id} generating...`);
      fs.mkdirSync(outputDir, { recursive: true });

      const ok = await downloadImage(fullPrompt, outputPath);
      if (ok) {
        generated++;
        console.log(`  [${total}] ${id} ✓`);
      } else {
        failed++;
      }

      // Be polite to the free service
      await new Promise((r) => setTimeout(r, 1500));
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
