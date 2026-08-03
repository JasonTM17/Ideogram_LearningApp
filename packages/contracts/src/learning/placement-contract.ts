import { z } from 'zod';

import { languagePackCodes, learningObjectiveKeys } from '../content/content-vocabulary';
import { placementSessionStatuses } from './learning-vocabulary';

const placementPayloadSchema = z
  .record(z.string().min(1).max(80), z.unknown())
  .refine((payload) => JSON.stringify(payload).length <= 65_536, {
    message: 'Placement payload is too large.',
  });

export const placementQuestionSchema = z
  .object({
    placementQuestionId: z.uuid(),
    questionKey: z.string().regex(/^[a-z0-9][a-z0-9-]{1,118}$/u),
    questionType: z.enum(['reading', 'listening', 'vocabulary', 'grammar']),
    promptPayload: placementPayloadSchema,
    sequence: z.number().int().min(1).max(500),
  })
  .strict();

export const placementQuestionSetSchema = z
  .object({
    languageCode: z.enum(languagePackCodes),
    objectiveKey: z.enum(learningObjectiveKeys),
    placementQuestionSetId: z.uuid(),
    placementVersion: z.string().regex(/^v\d+\.\d+\.\d+$/u),
    questions: z.array(placementQuestionSchema).min(1).max(500),
    titleVietnamese: z.string().min(1).max(240),
  })
  .strict();

export const placementCatalogResponseSchema = z
  .object({ questionSets: z.array(placementQuestionSetSchema).max(12) })
  .strict();

export const placementSessionStartInputSchema = z
  .object({
    idempotencyKey: z.uuid(),
    placementQuestionSetId: z.uuid(),
  })
  .strict();

export const placementSessionStartReceiptSchema = z
  .object({
    idempotentReplay: z.boolean(),
    placementSessionId: z.uuid(),
    sessionStatus: z.enum(placementSessionStatuses),
  })
  .strict();

export const placementAnswerInputSchema = z
  .object({
    answerPayload: placementPayloadSchema,
    attemptNumber: z.number().int().min(1).max(10),
    clientRecordedAt: z.iso.datetime().nullable(),
    deviceId: z.uuid(),
    deviceSequence: z.number().int().positive(),
    idempotencyKey: z.uuid(),
    placementQuestionId: z.uuid(),
    responseTimeMs: z.number().int().min(0).max(7_200_000).nullable(),
  })
  .strict();

export const placementAnswerReceiptSchema = z
  .object({
    idempotentReplay: z.boolean(),
    placementAnswerId: z.uuid(),
  })
  .strict();

export const placementSessionSubmitInputSchema = z
  .object({ placementSessionId: z.uuid() })
  .strict();

export const placementSessionReceiptSchema = z
  .object({
    completedAt: z.iso.datetime().nullable(),
    confidence: z.number().min(0).max(1).nullable(),
    placementSessionId: z.uuid(),
    recommendedLevelCode: z.string().min(1).max(32).nullable(),
    scoredAt: z.iso.datetime().nullable(),
    sessionStatus: z.enum(placementSessionStatuses),
    submittedAt: z.iso.datetime().nullable(),
  })
  .strict();

export type PlacementAnswerInput = z.infer<typeof placementAnswerInputSchema>;
export type PlacementAnswerReceipt = z.infer<typeof placementAnswerReceiptSchema>;
export type PlacementCatalogResponse = z.infer<typeof placementCatalogResponseSchema>;
export type PlacementQuestion = z.infer<typeof placementQuestionSchema>;
export type PlacementQuestionSet = z.infer<typeof placementQuestionSetSchema>;
export type PlacementSessionReceipt = z.infer<typeof placementSessionReceiptSchema>;
export type PlacementSessionStartInput = z.infer<typeof placementSessionStartInputSchema>;
export type PlacementSessionStartReceipt = z.infer<typeof placementSessionStartReceiptSchema>;
export type PlacementSessionSubmitInput = z.infer<typeof placementSessionSubmitInputSchema>;
