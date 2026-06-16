import { NextRequest, NextResponse } from "next/server";
import { getUnitTest } from "@/lib/lessons";

export function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return params.then(({ id }) => {
    const test = getUnitTest(id);
    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }
    return NextResponse.json(test);
  });
}
