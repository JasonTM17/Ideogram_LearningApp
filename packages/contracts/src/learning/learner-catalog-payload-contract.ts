import { z } from 'zod';

import { activityPayloadSchemas } from '../content/activity-payload-schemas';

import type { ActivityType } from '../content/content-vocabulary';

const publicExampleSchema = z
  .object({
    translationVietnamese: z.string().min(1).max(1_000),
    value: z.string().min(1).max(1_000),
  })
  .strict();

const publicPromptOptionSchema = z
  .object({
    optionId: z.string().regex(/^[a-z0-9-]{2,80}$/u),
    text: z.string().min(1).max(500),
  })
  .strict();

const publicObjectiveQuestionSchema = z
  .object({
    options: z.array(publicPromptOptionSchema).min(2).max(6),
    prompt: z.string().min(1).max(2_000),
    questionId: z.string().regex(/^[a-z0-9-]{2,80}$/u),
  })
  .strict();

export const learnerCatalogActivityPromptPayloadSchemas = {
  grammar: z
    .object({
      examples: z.array(publicExampleSchema).min(1).max(8),
      explanationVietnamese: z.string().min(1).max(4_000),
      grammarPoint: z.string().min(1).max(200),
    })
    .strict(),
  listening: z
    .object({
      audioAssetPath: z.string().min(1).max(500),
      audioProductionStatus: z.enum(['planned', 'recorded']),
      questions: z.array(publicObjectiveQuestionSchema).min(1).max(12),
      transcript: z.string().min(1).max(12_000),
    })
    .strict(),
  objective_quiz: z
    .object({ questions: z.array(publicObjectiveQuestionSchema).min(1).max(20) })
    .strict(),
  reading: z
    .object({
      questions: z.array(publicObjectiveQuestionSchema).min(1).max(12),
      text: z.string().min(1).max(12_000),
    })
    .strict(),
  retrieval: z
    .object({
      prompt: z.string().min(1).max(2_000),
      promptVietnamese: z.string().min(1).max(2_000),
    })
    .strict(),
  speaking: z
    .object({
      scenarioVietnamese: z.string().min(1).max(2_000),
      targetPrompt: z.string().min(1).max(2_000),
    })
    .strict(),
  vocabulary: z
    .object({
      entries: z
        .array(
          z
            .object({
              example: publicExampleSchema,
              meaningVietnamese: z.string().min(1).max(1_000),
              reading: z.string().min(1).max(500),
              term: z.string().min(1).max(500),
            })
            .strict(),
        )
        .min(1)
        .max(40),
    })
    .strict(),
  writing: z
    .object({
      scenarioVietnamese: z.string().min(1).max(2_000),
      targetPrompt: z.string().min(1).max(2_000),
    })
    .strict(),
} as const;

export type LearnerCatalogActivityPromptPayload = {
  [TActivityType in keyof typeof learnerCatalogActivityPromptPayloadSchemas]: z.infer<
    (typeof learnerCatalogActivityPromptPayloadSchemas)[TActivityType]
  >;
}[keyof typeof learnerCatalogActivityPromptPayloadSchemas];

const projectQuestion = (question: {
  options: { optionId: string; text: string }[];
  prompt: string;
  questionId: string;
}) => ({
  options: question.options.map(({ optionId, text }) => ({ optionId, text })),
  prompt: question.prompt,
  questionId: question.questionId,
});

export const projectLearnerCatalogPromptPayload = (
  activityType: ActivityType,
  input: unknown,
): LearnerCatalogActivityPromptPayload => {
  switch (activityType) {
    case 'grammar':
    case 'vocabulary':
      return learnerCatalogActivityPromptPayloadSchemas[activityType].parse(
        activityPayloadSchemas[activityType].parse(input),
      );
    case 'listening': {
      const payload = activityPayloadSchemas.listening.parse(input);
      return learnerCatalogActivityPromptPayloadSchemas.listening.parse({
        audioAssetPath: payload.audioAssetPath,
        audioProductionStatus: payload.audioProductionStatus,
        questions: payload.questions.map(projectQuestion),
        transcript: payload.transcript,
      });
    }
    case 'objective_quiz': {
      const payload = activityPayloadSchemas.objective_quiz.parse(input);
      return { questions: payload.questions.map(projectQuestion) };
    }
    case 'reading': {
      const payload = activityPayloadSchemas.reading.parse(input);
      return { questions: payload.questions.map(projectQuestion), text: payload.text };
    }
    case 'retrieval': {
      const payload = activityPayloadSchemas.retrieval.parse(input);
      return { prompt: payload.prompt, promptVietnamese: payload.promptVietnamese };
    }
    case 'speaking':
    case 'writing': {
      const payload = activityPayloadSchemas[activityType].parse(input);
      return {
        scenarioVietnamese: payload.scenarioVietnamese,
        targetPrompt: payload.targetPrompt,
      };
    }
  }
};
