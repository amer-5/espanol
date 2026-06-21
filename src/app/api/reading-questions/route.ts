import { NextRequest, NextResponse } from "next/server";
import { getAI, CHAT_MODEL } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const { text_es, title, glossary } = await req.json();

    const client = getAI();
    const response = await client.chat.completions.create({
      model: CHAT_MODEL,
      max_tokens: 800,
      messages: [{
        role: "user",
        content: `You are a Spanish language teacher creating comprehension questions for A1 students.

Reading text (Spanish): "${text_es}"
Title: "${title}"
Glossary: ${JSON.stringify(glossary)}

Generate 3 multiple-choice comprehension questions in Bosnian language (bosanski jezik, Bosnia and Herzegovina — NOT Croatian, NOT Serbian, NOT Slovenian) about this text.

Return ONLY valid JSON array:
[
  {
    "question_bs": "Pitanje na bosanskom?",
    "options": ["Opcija A", "Opcija B", "Opcija C", "Opcija D"],
    "answerIndex": 0
  }
]`
      }],
    });

    const raw = response.choices[0]?.message?.content ?? "[]";
    const json = JSON.parse(raw.trim().replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, ""));
    return NextResponse.json({ questions: json });
  } catch (err) {
    console.error("Reading questions error:", err);
    return NextResponse.json({ questions: [] }, { status: 500 });
  }
}
