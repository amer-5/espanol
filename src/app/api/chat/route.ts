import { NextRequest, NextResponse } from "next/server";
import { getOpenRouter, CHAT_MODEL } from "@/lib/openrouter";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, systemPromptHint, level, allowedGrammar, scenario_bs } =
      body as {
        messages: Array<{ role: "user" | "assistant"; content: string }>;
        systemPromptHint: string;
        level: string;
        allowedGrammar: string[];
        scenario_bs: string;
      };

    const systemPrompt = `Ti si prijateljski i strpljiv govornik španskog koji pomaže početniku da vježba razgovor.

Scenarij: ${scenario_bs}
Nivo studenta: ${level}
Dozvoljeno gradivo: ${allowedGrammar.join(", ")}

PRAVILA:
1. Govori ISKLJUČIVO na španskom u svim porukama u razgovoru
2. Koristi SAMO vokabular i gramatiku prikladnu za nivo ${level}
3. Piši kratke, jasne rečenice
4. Budi topao i ohrabrujući
5. Ispravke radi SAMO na kraju razmjene (svake 3-4 poruke), kratko i na bosanskom
6. Format ispravke: "💡 Napomena: [ispravka na bosanskom]"
7. Ako student napravi grešku, nastavi razgovor normalno — ne prekidaj tok

Hint: ${systemPromptHint}`;

    const client = getOpenRouter();
    const response = await client.chat.completions.create({
      model: CHAT_MODEL,
      max_tokens: 500,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
    });

    const text = response.choices[0]?.message?.content ?? "";
    return NextResponse.json({ message: text });
  } catch (err) {
    console.error("Chat error:", err);
    return NextResponse.json(
      { error: "Failed to get AI response" },
      { status: 500 }
    );
  }
}
