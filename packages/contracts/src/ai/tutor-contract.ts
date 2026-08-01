import { z } from 'zod';

import { languagePackCodes, learningObjectiveKeys } from '../content/content-vocabulary';

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
  .strict();

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

export type LearnerTutorPreference = z.infer<typeof learnerTutorPreferenceSchema>;
export type TutorTurnInput = z.infer<typeof tutorTurnInputSchema>;
export type TutorTurnRequest = z.infer<typeof tutorTurnRequestSchema>;
export type TutorTurnResponse = z.infer<typeof tutorTurnResponseSchema>;
