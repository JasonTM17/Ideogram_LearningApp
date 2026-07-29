import { z } from 'zod';

const promptOptionSchema = z.object({
  isCorrect: z.boolean(),
  optionId: z.string().regex(/^[a-z0-9-]{2,80}$/u),
  text: z.string().min(1).max(500),
});

export const objectiveQuestionSchema = z
  .object({
    explanationVietnamese: z.string().min(1).max(2_000),
    prompt: z.string().min(1).max(2_000),
    questionId: z.string().regex(/^[a-z0-9-]{2,80}$/u),
    options: z.array(promptOptionSchema).min(2).max(6),
  })
  .superRefine((question, context) => {
    if (question.options.filter((option) => option.isCorrect).length !== 1) {
      context.addIssue({
        code: 'custom',
        message: 'An objective question must have exactly one correct option.',
      });
    }
  });

const exampleSchema = z.object({
  translationVietnamese: z.string().min(1).max(1_000),
  value: z.string().min(1).max(1_000),
});

const listeningPayloadSchema = z
  .object({
    audioAssetPath: z.string().min(1).max(500),
    audioProductionStatus: z.enum(['planned', 'recorded']),
    audioSha256: z
      .string()
      .regex(/^[a-f0-9]{64}$/u)
      .optional(),
    questions: z.array(objectiveQuestionSchema).min(1).max(12),
    transcript: z.string().min(1).max(12_000),
    transcriptVietnamese: z.string().min(1).max(12_000),
  })
  .superRefine((payload, context) => {
    if (payload.audioProductionStatus === 'recorded' && !payload.audioSha256) {
      context.addIssue({
        code: 'custom',
        message: 'Recorded audio requires an integrity checksum.',
        path: ['audioSha256'],
      });
    }
    if (payload.audioProductionStatus === 'planned' && payload.audioSha256) {
      context.addIssue({
        code: 'custom',
        message: 'Planned audio must not claim a recording checksum.',
        path: ['audioSha256'],
      });
    }
  });

export const activityPayloadSchemas = {
  grammar: z.object({
    explanationVietnamese: z.string().min(1).max(4_000),
    examples: z.array(exampleSchema).min(1).max(8),
    grammarPoint: z.string().min(1).max(200),
  }),
  listening: listeningPayloadSchema,
  objective_quiz: z.object({
    questions: z.array(objectiveQuestionSchema).min(1).max(20),
  }),
  reading: z.object({
    questions: z.array(objectiveQuestionSchema).min(1).max(12),
    text: z.string().min(1).max(12_000),
    translationVietnamese: z.string().min(1).max(12_000),
  }),
  retrieval: z.object({
    acceptedAnswers: z.array(z.string().min(1).max(500)).min(1).max(12),
    prompt: z.string().min(1).max(2_000),
    promptVietnamese: z.string().min(1).max(2_000),
  }),
  speaking: z.object({
    rubricVietnamese: z.string().min(1).max(4_000),
    scenarioVietnamese: z.string().min(1).max(2_000),
    targetPrompt: z.string().min(1).max(2_000),
  }),
  vocabulary: z.object({
    entries: z
      .array(
        z.object({
          example: exampleSchema,
          meaningVietnamese: z.string().min(1).max(1_000),
          reading: z.string().min(1).max(500),
          term: z.string().min(1).max(500),
        }),
      )
      .min(1)
      .max(40),
  }),
  writing: z.object({
    rubricVietnamese: z.string().min(1).max(4_000),
    scenarioVietnamese: z.string().min(1).max(2_000),
    targetPrompt: z.string().min(1).max(2_000),
  }),
} as const;
