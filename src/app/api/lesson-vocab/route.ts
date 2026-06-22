import { NextRequest, NextResponse } from "next/server";
import { getLesson } from "@/lib/lessons";

export async function GET(req: NextRequest) {
  const ids = req.nextUrl.searchParams.get("ids")?.split(",") ?? [];
  const vocab: string[] = [];

  for (const id of ids.slice(0, 20)) {
    const lesson = getLesson(id.trim());
    if (!lesson) continue;
    for (const v of lesson.vocabulary) {
      if (v.es) vocab.push(v.es);
      if (v.bs) vocab.push(v.bs);
    }
  }

  return NextResponse.json({ vocab: [...new Set(vocab)] });
}
