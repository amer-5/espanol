import { z } from "zod";

// Vocabulary item
export const VocabItemSchema = z.object({
  es: z.string(),
  bs: z.string(),
  pos: z.string(),
  ipa: z.string().optional(),
  example_es: z.string(),
  example_bs: z.string(),
  illustrationRef: z.string().optional(),
});

// Grammar table
export const GrammarTableSchema = z.object({
  headers: z.array(z.string()),
  rows: z.array(z.array(z.string())),
});

// Grammar concept
export const GrammarConceptSchema = z.object({
  concept: z.string(),
  explanation_bs: z.string(),
  table: GrammarTableSchema.optional(),
  examples: z.array(z.object({ es: z.string(), bs: z.string() })),
  tips: z.string().optional(),
});

// Dialogue line
export const DialogueLineSchema = z.object({
  speaker: z.string(),
  es: z.string(),
  bs: z.string(),
});

// Reading section
export const ReadingSchema = z.object({
  title: z.string(),
  text_es: z.string(),
  glossary: z.array(z.object({ es: z.string(), bs: z.string() })),
  comprehensionQuestions: z.array(
    z.object({
      question_bs: z.string(),
      options: z.array(z.string()),
      answerIndex: z.number().int().min(0),
    })
  ),
});

// Exercise types
export const MultipleChoiceExerciseSchema = z.object({
  type: z.literal("multiple_choice"),
  prompt_bs: z.string(),
  options: z.array(z.string()),
  answerIndex: z.number().int().min(0),
  explanation_bs: z.string().optional(),
});

export const FillBlankExerciseSchema = z.object({
  type: z.literal("fill_blank"),
  prompt_bs: z.string(),
  answer: z.string(),
  acceptedAnswers: z.array(z.string()),
});

export const TranslationExerciseSchema = z.object({
  type: z.literal("translation"),
  direction: z.enum(["bs_to_es", "es_to_bs"]),
  prompt: z.string(),
  answer: z.string(),
  acceptedAnswers: z.array(z.string()),
});

export const MatchingExerciseSchema = z.object({
  type: z.literal("matching"),
  prompt_bs: z.string(),
  pairs: z.array(z.object({ es: z.string(), bs: z.string() })),
});

export const ListeningExerciseSchema = z.object({
  type: z.literal("listening"),
  prompt_bs: z.string(),
  audioText_es: z.string(),
  answer: z.string(),
});

export const SpeakingExerciseSchema = z.object({
  type: z.literal("speaking"),
  prompt_bs: z.string(),
  modelAnswer_es: z.string(),
});

export const ExerciseSchema = z.discriminatedUnion("type", [
  MultipleChoiceExerciseSchema,
  FillBlankExerciseSchema,
  TranslationExerciseSchema,
  MatchingExerciseSchema,
  ListeningExerciseSchema,
  SpeakingExerciseSchema,
]);

// AI Conversation config
export const AIConversationSchema = z.object({
  enabled: z.boolean(),
  scenario_bs: z.string(),
  level: z.string(),
  allowedGrammar: z.array(z.string()),
  systemPromptHint: z.string(),
});

// Illustration
export const IllustrationSchema = z.object({
  prompt: z.string(),
  alt: z.string(),
  filename: z.string(),
});

// Full lesson schema
export const LessonSchema = z.object({
  id: z.string(),
  level: z.enum(["A1", "A2", "B1"]),
  unit: z.number().int().min(1),
  lessonNumber: z.number().int().min(1),
  title: z.string(),
  subtitle: z.string(),
  estimatedMinutes: z.number().int().min(5),
  objectives: z.array(z.string()),
  prerequisites: z.array(z.string()),
  vocabulary: z.array(VocabItemSchema).min(5).max(20),
  grammar: z.array(GrammarConceptSchema).min(1).max(4),
  dialogue: z.object({
    title: z.string(),
    lines: z.array(DialogueLineSchema),
  }),
  reading: ReadingSchema,
  exercises: z.array(ExerciseSchema).min(4),
  aiConversation: AIConversationSchema,
  illustration: IllustrationSchema,
  review: z.object({
    newWords: z.number().int(),
    spacedRepetitionTags: z.array(z.string()),
  }),
});

export type Lesson = z.infer<typeof LessonSchema>;
export type VocabItem = z.infer<typeof VocabItemSchema>;
export type Exercise = z.infer<typeof ExerciseSchema>;
export type GrammarConcept = z.infer<typeof GrammarConceptSchema>;

// ---- Test schema ----
export const TestQuestionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("translation"),
    direction: z.enum(["bs_to_es", "es_to_bs"]),
    prompt: z.string(),
    answer: z.string(),
    acceptedAnswers: z.array(z.string()),
    points: z.number().int().min(1),
    lessonId: z.string(),
  }),
  z.object({
    type: z.literal("fill_blank"),
    prompt_bs: z.string(),
    answer: z.string(),
    acceptedAnswers: z.array(z.string()),
    points: z.number().int().min(1),
    lessonId: z.string(),
  }),
  z.object({
    type: z.literal("listening"),
    prompt_bs: z.string(),
    audioText_es: z.string(),
    answer: z.string(),
    points: z.number().int().min(1),
    lessonId: z.string(),
  }),
  z.object({
    type: z.literal("multiple_choice"),
    prompt_bs: z.string(),
    options: z.array(z.string()),
    answerIndex: z.number().int().min(0),
    points: z.number().int().min(1),
    lessonId: z.string(),
  }),
  z.object({
    type: z.literal("writing"),
    prompt_bs: z.string(),
    minWords: z.number().int().min(5),
    gradedByAI: z.boolean(),
    rubric_bs: z.string(),
    points: z.number().int().min(1),
    lessonId: z.string(),
  }),
]);

export const UnitTestSchema = z.object({
  id: z.string(),
  level: z.enum(["A1", "A2", "B1"]),
  unit: z.number().int().min(1),
  title: z.string(),
  cumulative: z.boolean(),
  timeLimitMinutes: z.number().int().min(5),
  passThreshold: z.number().min(0).max(1),
  questions: z.array(TestQuestionSchema).min(3),
  reviewMapping: z.array(
    z.object({ lessonId: z.string(), topic: z.string() })
  ),
});

export type UnitTest = z.infer<typeof UnitTestSchema>;
export type TestQuestion = z.infer<typeof TestQuestionSchema>;
