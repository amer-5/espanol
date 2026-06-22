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

    const systemPrompt = `Ti si španski govornik koji vježba razgovor s početnikom. Vodi prirodan razgovor na španskom.

Korisnik govori bosanski. Završio je lekcije: ${lessonNames || "još nijednu"}.
Vokabular koji zna: ${vocabList || "osnove"}.

PRAVILA — ovo je OBAVEZNO:
1. Odgovaraj ISKLJUČIVO na španskom — kao pravi razgovor
2. Koristi SAMO vokabular koji korisnik zna (vidi listu iznad)
3. Kratke rečenice — max 1-2 rečenice po odgovoru
4. Postavljaj pitanja korisniku da razgovor ide dalje
5. NE objašnjavaš ništa, NE prevadiš, NE daješ lekcije
6. Ako korisnik pogriješi gramatiku, odgovori ispravnom verzijom prirodno (ne komentarišući)
7. JEDINI izuzetak: ako korisnik DIREKTNO pita na bosanskom za prijevod ili pomoć, kratko odgovori na bosanskom pa nastavi na španskom

Primjer dobrog odgovora: "¡Hola! ¿Cómo estás hoy?"
Primjer lošeg odgovora: "Hola znači zdravo, a ¿Cómo estás? znači kako si..."`;

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
