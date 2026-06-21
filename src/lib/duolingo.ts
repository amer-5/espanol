import type { Exercise, VocabItem } from "@/types/lesson";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Tokenize a Spanish sentence into word tiles (split on spaces, keep punctuation attached) */
function tokenize(sentence: string): string[] {
  return sentence.trim().split(/\s+/).filter(Boolean);
}

/** Add up to N single-word distractors from vocab (first token of v.es only) */
function addDistractors(correctWords: string[], allVocab: VocabItem[], count = 3): string[] {
  const distractors: string[] = [];
  const clean = (w: string) => w.toLowerCase().replace(/[¡!¿?.,]/g, "");
  const used = new Set(correctWords.map(clean));
  for (const v of shuffle(allVocab)) {
    // Use only the first word of v.es so we don't inject full phrases as tiles
    const firstWord = v.es.trim().split(/\s+/)[0];
    if (!firstWord || firstWord.length < 2) continue;
    if (used.has(clean(firstWord))) continue;
    distractors.push(firstWord);
    used.add(clean(firstWord));
    if (distractors.length >= count) break;
  }
  return distractors;
}

/**
 * Generate a Duolingo-style session from vocab items + static exercises.
 * Returns ~15-20 exercises that repeat each word through multiple types.
 */
export function generateDuolingoSession(
  vocab: VocabItem[],
  staticExercises: Exercise[]
): Exercise[] {
  const generated: Exercise[] = [];
  const picked = shuffle(vocab).slice(0, 8); // up to 8 vocab items

  for (const word of picked) {
    // 1. Multiple choice: show BS word, pick correct ES word
    const wrongOptions = shuffle(vocab)
      .filter((v) => v.es !== word.es)
      .slice(0, 3)
      .map((v) => v.es);
    const mcOptions = shuffle([word.es, ...wrongOptions]);
    const mcAnswer = mcOptions.indexOf(word.es);
    generated.push({
      type: "multiple_choice",
      prompt_bs: `Kako se kaže: "${word.bs}"?`,
      options: mcOptions,
      answerIndex: mcAnswer,
    } as Exercise);

    // 2. Word bank: assemble example sentence from tiles
    const exWords = tokenize(word.example_es);
    if (exWords.length >= 3 && exWords.length <= 12) {
      const distractors = addDistractors(exWords, vocab, 3);
      generated.push({
        type: "word_bank",
        prompt_bs: word.example_bs,
        answer_es: word.example_es,
        words: shuffle([...exWords, ...distractors]),
      } as Exercise);
    }

    // 3. Reverse: show ES word, type BS meaning (every other word)
    if (generated.length % 3 === 0) {
      generated.push({
        type: "translation",
        direction: "es_to_bs",
        prompt: word.es,
        answer: word.bs,
        acceptedAnswers: [word.bs],
      } as Exercise);
    }
  }

  // Mix in static exercises, take up to 8
  const staticPick = shuffle(staticExercises)
    .filter((e) => e.type !== "speaking") // skip speaking for now
    .slice(0, 8);

  const combined = shuffle([...generated, ...staticPick]);
  // Cap at 20, always end with a speaking exercise if available
  const session = combined.slice(0, 18);
  const speaking = staticExercises.find((e) => e.type === "speaking");
  if (speaking) session.push(speaking);
  return session;
}
