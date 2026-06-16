import { NextRequest, NextResponse } from "next/server";
import { getLesson } from "@/lib/lessons";

export function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return params.then(({ id }) => {
    const lesson = getLesson(id);
    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }
    return NextResponse.json(lesson);
  });
}
