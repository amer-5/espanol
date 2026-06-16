import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { progress, users, streaks } from "../../../../db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "No user ID" }, { status: 400 });

  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(progress)
      .where(eq(progress.userId, userId));
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "No user ID" }, { status: 400 });

  try {
    const body = await req.json();
    const { lessonId, status, score } = body as {
      lessonId: string;
      status: string;
      score?: number;
    };

    const db = getDb();

    // Upsert user
    await db.insert(users).values({ id: userId }).onConflictDoNothing();

    // Upsert progress
    await db
      .insert(progress)
      .values({
        userId,
        lessonId,
        status,
        score: score ?? null,
        completedAt: status === "completed" ? new Date() : null,
      })
      .onConflictDoUpdate({
        target: [progress.userId, progress.lessonId],
        set: { status, score: score ?? null, completedAt: status === "completed" ? new Date() : null },
      });

    // Update streak
    const today = new Date().toISOString().split("T")[0];
    const existingStreak = await db
      .select()
      .from(streaks)
      .where(eq(streaks.userId, userId));

    if (existingStreak.length === 0) {
      await db.insert(streaks).values({
        userId,
        currentStreak: 1,
        longestStreak: 1,
        lastActiveDate: today,
      });
    } else {
      const s = existingStreak[0];
      if (s.lastActiveDate !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yest = yesterday.toISOString().split("T")[0];
        const newCurrent = s.lastActiveDate === yest ? s.currentStreak + 1 : 1;
        const newLongest = Math.max(newCurrent, s.longestStreak);
        await db
          .update(streaks)
          .set({ currentStreak: newCurrent, longestStreak: newLongest, lastActiveDate: today })
          .where(eq(streaks.userId, userId));
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  }
}
