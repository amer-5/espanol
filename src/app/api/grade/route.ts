import { NextRequest, NextResponse } from "next/server";
import { getAI, CHAT_MODEL } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, rubric_bs, maxPoints } = body as {
      text: string;
      rubric_bs: string;
      maxPoints: number;
    };

    const client = getAI();
    const response = await client.chat.completions.create({
      model: CHAT_MODEL,
      max_tokens: 600,
      messages: [{
        role: "user",
        content: `Ocijeni tekst studenta. Vrati SAMO JSON.\n\nTEKST: "${text}"\n\nRUBRIKA: ${rubric_bs}\n\nMaks bodova: ${maxPoints}\n\n{"score": broj, "feedback_bs": "...", "corrected_es": "..."}`
      }],
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    let json = raw.trim().replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "");
    return NextResponse.json(JSON.parse(json));
  } catch (err) {
    console.error("Grade error:", err);
    return NextResponse.json({ error: "Greška pri ocjenjivanju" }, { status: 500 });
  }
}
