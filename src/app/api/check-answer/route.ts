import { NextRequest, NextResponse } from "next/server";
import { getAI, CHAT_MODEL } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const { userAnswer, correctAnswer, acceptedAnswers, prompt, exerciseType } = await req.json();

    const client = getAI();
    const response = await client.chat.completions.create({
      model: CHAT_MODEL,
      max_tokens: 100,
      messages: [{
        role: "user",
        content: `You are a Spanish language teacher. Check if the student's answer is correct.

Exercise: ${exerciseType} (translation/fill_blank)
Prompt: "${prompt}"
Correct answer(s): ${JSON.stringify([correctAnswer, ...(acceptedAnswers || [])])}
Student's answer: "${userAnswer}"

Rules:
- Minor spelling mistakes are OK if meaning is clear
- Accent marks missing is OK (e.g. "como" for "cómo")
- Extra punctuation is OK
- If the student's answer means the same thing as any accepted answer, it's correct
- "zdravo" should match "zdravo / bok" if slash means alternatives

Reply with ONLY valid JSON: {"correct": true/false}`
      }],
    });

    const raw = response.choices[0]?.message?.content ?? '{"correct":false}';
    const json = JSON.parse(raw.trim().replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, ""));
    return NextResponse.json({ correct: !!json.correct });
  } catch {
    return NextResponse.json({ correct: false });
  }
}
