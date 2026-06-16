import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, rubric_bs, maxPoints } = body as {
      text: string;
      rubric_bs: string;
      maxPoints: number;
    };

    const prompt = `Ocijeni sljedeći španskojezični tekst koji je napisao student-početnik (nivo A1/A2/B1).

TEKST STUDENTA:
"${text}"

RUBRIKA OCJENJIVANJA:
${rubric_bs}

Maksimalni broj bodova: ${maxPoints}

Odgovori u sljedećem JSON formatu:
{
  "score": <broj bodova od 0 do ${maxPoints}>,
  "feedback_bs": "<kratak feedback na bosanskom, 2-3 rečenice, ohrabrujuć ton>",
  "corrected_es": "<ispravljeni tekst na španskom>"
}

Vrati SAMO JSON, bez objašnjenja.`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    });

    const rawText =
      response.content[0].type === "text" ? response.content[0].text : "{}";
    let jsonStr = rawText.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "");
    }

    const result = JSON.parse(jsonStr);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Grade error:", err);
    return NextResponse.json(
      { error: "Failed to grade writing" },
      { status: 500 }
    );
  }
}
