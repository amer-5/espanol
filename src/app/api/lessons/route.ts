import { NextResponse } from "next/server";
import { getCurriculum } from "@/lib/lessons";

export function GET() {
  try {
    const curriculum = getCurriculum();
    return NextResponse.json(curriculum);
  } catch {
    return NextResponse.json({ error: "Failed to load curriculum" }, { status: 500 });
  }
}
