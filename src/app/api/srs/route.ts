import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { vocabSrs, users } from "../../../../db/schema";
import { eq, and, lte } from "drizzle-orm";
import { sm2 } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "No user ID" }, { status: 400 });

  try {
    const db = getDb();
    const now = new Date();
    const due = await db
      .select()
      .from(vocabSrs)
      .where(and(eq(vocabSrs.userId, userId), lte(vocabSrs.dueDate, now)));
    return NextResponse.json(due);
  } catch {
    return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "No user ID" }, { status: 400 });

  try {
    const body = await req.json();
    const { wordEs, lessonId, quality } = body as {
      wordEs: string;
      lessonId: string;
      quality: number; // 0-5
    };

    const db = getDb();
    await db.insert(users).values({ id: userId }).onConflictDoNothing();

    const existing = await db
      .select()
      .from(vocabSrs)
      .where(
        and(eq(vocabSrs.userId, userId), eq(vocabSrs.wordEs, wordEs))
      );

    if (existing.length === 0) {
      const { repetitions, easeFactor, interval, dueDate } = sm2(
        quality,
        0,
        2.5,
        1
      );
      await db.insert(vocabSrs).values({
        userId,
        wordEs,
        lessonId,
        easeFactor,
        interval,
        dueDate,
        repetitions,
      });
    } else {
      const item = existing[0];
      const { repetitions, easeFactor, interval, dueDate } = sm2(
        quality,
        item.repetitions,
        item.easeFactor,
        item.interval
      );
      await db
        .update(vocabSrs)
        .set({ repetitions, easeFactor, interval, dueDate })
        .where(
          and(eq(vocabSrs.userId, userId), eq(vocabSrs.wordEs, wordEs))
        );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  }
}
