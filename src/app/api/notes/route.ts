import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { notes, users } from "../../../../db/schema";
import { eq, desc } from "drizzle-orm";
import { getAI, CHAT_MODEL } from "@/lib/ai";

async function translateText(text: string): Promise<string> {
  try {
    const client = getAI();
    const res = await client.chat.completions.create({
      model: CHAT_MODEL,
      max_tokens: 60,
      messages: [{
        role: "user",
        content: `Translate this Spanish text to Bosnian. Reply with ONLY the translation, nothing else: "${text}"`
      }],
    });
    return res.choices[0]?.message?.content?.trim() ?? "";
  } catch {
    return "";
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, selectedText, lessonId } = await req.json();
    if (!userId || !selectedText?.trim()) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const db = getDb();
    await db.insert(users).values({ id: userId }).onConflictDoNothing();

    const translation = await translateText(selectedText.trim());

    const [note] = await db.insert(notes).values({
      userId,
      selectedText: selectedText.trim(),
      translation,
      lessonId: lessonId ?? null,
    }).returning();

    return NextResponse.json({ note });
  } catch (err) {
    console.error("Notes POST error:", err);
    return NextResponse.json({ error: "Greška" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId");
    if (!userId) return NextResponse.json({ notes: [] });

    const db = getDb();
    const rows = await db
      .select()
      .from(notes)
      .where(eq(notes.userId, userId))
      .orderBy(desc(notes.createdAt));

    return NextResponse.json({ notes: rows });
  } catch {
    return NextResponse.json({ notes: [] });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id, userId } = await req.json();
    const db = getDb();
    await db.delete(notes).where(eq(notes.id, id));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Greška" }, { status: 500 });
  }
}
