import { NextRequest, NextResponse } from "next/server";
import { getAI, CHAT_MODEL } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const { messages, knownVocab, completedLessons } = await req.json() as {
      messages: Array<{ role: "user" | "assistant"; content: string }>;
      knownVocab: string[];
      completedLessons: string[];
    };

    const vocabList = knownVocab.slice(0, 120).join(", ");
    const lessonNames = completedLessons.join(", ");

    const systemPrompt = `Ti si prijateljski AI asistent koji pomaže početniku naučiti španski. Korisnik govori bosanski (bosanski jezik, Bosna i Hercegovina).

Korisnik je završio ove lekcije: ${lessonNames || "još nijednu"}.
Vokabular koji korisnik zna: ${vocabList || "osnove"}.

PRAVILA:
1. Odgovaraj na bosanskom jeziku (NIKAKO hrvatskom, srpskom niti slovenačkom)
2. Kada korisnik napiše nešto na španskom, ispravi greške ljubazno
3. Kada objašnjavaš špansku riječ ili frazu, uvijek daj i primjer rečenice
4. Ako korisnik pita za prijevod, daj prijevod + izgovor u zagradi
5. Fokusiraj se na gradivo koje korisnik već poznaje iz lekcija
6. Budi kratak i jasan — max 3-4 rečenice po odgovoru
7. Koristi emojije da bude zabavno 😊
8. Možeš predložiti kratke vježbe ili pitanja da testirate gradivo

Ako korisnik želi vježbati razgovor na španskom, prebaci se na španski ali uz bosanske napomene.`;

    const client = getAI();
    const response = await client.chat.completions.create({
      model: CHAT_MODEL,
      max_tokens: 400,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
    });

    return NextResponse.json({ message: response.choices[0]?.message?.content ?? "" });
  } catch (err) {
    console.error("Free chat error:", err);
    return NextResponse.json({ error: "AI nije dostupan" }, { status: 500 });
  }
}
