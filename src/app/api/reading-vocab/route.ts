import { NextRequest, NextResponse } from "next/server";
import { getAI, CHAT_MODEL } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const { text_es, knownWords } = await req.json() as {
      text_es: string;
      knownWords: string[]; // already taught words
    };

    const client = getAI();
    const response = await client.chat.completions.create({
      model: CHAT_MODEL,
      max_tokens: 600,
      messages: [{
        role: "user",
        content: `You are a Spanish teacher. Extract vocabulary words from this text that a student should learn.

Text: "${text_es}"

Already known words (skip these): ${JSON.stringify(knownWords)}

Rules:
- Skip articles (el, la, los, las, un, una), prepositions (de, en, a, por, con, para), conjunctions (y, o, pero, que), pronouns (yo, tú, él, me, te, se)
- Skip words already in the known list
- Include meaningful content words: nouns, verbs (infinitive form), adjectives, adverbs
- Max 8 words
- Only include words actually in the text

Return ONLY valid JSON array:
[{"es": "palabra", "bs": "prijevod", "ipa": "opcional"}]`
      }],
    });

    const raw = response.choices[0]?.message?.content ?? "[]";
    const json = JSON.parse(raw.trim().replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, ""));
    return NextResponse.json({ words: Array.isArray(json) ? json : [] });
  } catch (err) {
    console.error("Reading vocab error:", err);
    return NextResponse.json({ words: [] });
  }
}
