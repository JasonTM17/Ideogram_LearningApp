import { z } from 'zod';

import {
  isLanguageLevelCode,
  languagePackCodes,
  learningObjectiveKeys,
} from '../content/content-vocabulary';

export const tutorExplanationDepthSchema = z.enum(['concise', 'standard', 'detailed']);
export const tutorToneSchema = z.enum(['encouraging', 'direct']);

export const learnerTutorPreferenceSchema = z
  .object({
    explanationDepth: tutorExplanationDepthSchema,
    preferredLanguageCode: z.enum(languagePackCodes),
    preferredObjectiveKey: z.enum(learningObjectiveKeys),
    tone: tutorToneSchema,
  })
  .strict();

export const tutorTurnInputSchema = z
  .object({
    learnerPreference: learnerTutorPreferenceSchema,
    message: z.string().trim().min(1).max(2_000),
    targetLevelCode: z.string().trim().min(1).max(32),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      !isLanguageLevelCode(value.learnerPreference.preferredLanguageCode, value.targetLevelCode)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Target level does not belong to the selected language.',
        path: ['targetLevelCode'],
      });
    }
  });

export const tutorTurnStateSchema = z.enum([
  'pending',
  'streaming',
  'completed',
  'cancelled',
  'failed',
]);

export const tutorTurnRequestSchema = tutorTurnInputSchema
  .extend({
    conversationId: z.uuid(),
    turnId: z.uuid(),
  })
  .strict();

export const tutorTurnResponseSchema = z
  .object({
    assessmentVietnamese: z.string().trim().min(1).max(1_000),
    example: z.string().trim().min(1).max(1_000),
    explanationVietnamese: z.string().trim().min(1).max(2_000),
    frequentVietnameseMistake: z.string().trim().min(1).max(1_000),
    nextExerciseVietnamese: z.string().trim().min(1).max(1_000),
    sourceBoundaryVietnamese: z.string().trim().min(1).max(500),
  })
  .strict();

export const tutorTurnUsageSchema = z
  .object({
    completionTokens: z.number().int().nonnegative().max(1_000_000),
    promptTokens: z.number().int().nonnegative().max(1_000_000),
    totalTokens: z.number().int().nonnegative().max(1_000_000),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.totalTokens !== value.promptTokens + value.completionTokens) {
      context.addIssue({
        code: 'custom',
        message: 'Token usage total must equal prompt plus completion tokens.',
        path: ['totalTokens'],
      });
    }
  });

export const tutorTurnReceiptSchema = z
  .object({
    conversationId: z.uuid(),
    idempotentReplay: z.boolean(),
    response: tutorTurnResponseSchema,
    state: z.literal('completed'),
    turnId: z.uuid(),
    usage: tutorTurnUsageSchema,
  })
  .strict();

export type LearnerTutorPreference = z.infer<typeof learnerTutorPreferenceSchema>;
export type TutorTurnInput = z.infer<typeof tutorTurnInputSchema>;
export type TutorTurnRequest = z.infer<typeof tutorTurnRequestSchema>;
export type TutorTurnResponse = z.infer<typeof tutorTurnResponseSchema>;
export type TutorTurnReceipt = z.infer<typeof tutorTurnReceiptSchema>;
export type TutorTurnUsage = z.infer<typeof tutorTurnUsageSchema>;
