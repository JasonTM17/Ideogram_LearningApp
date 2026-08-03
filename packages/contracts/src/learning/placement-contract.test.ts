import { describe, expect, it } from 'vitest';

import {
  placementAnswerInputSchema,
  placementCatalogResponseSchema,
  placementQuestionSetSchema,
  placementSessionReceiptSchema,
} from './placement-contract';

const question = {
  placementQuestionId: '42000000-0000-4000-8000-000000000001',
  questionKey: 'ja-n5-vocab-1',
  questionType: 'vocabulary' as const,
  promptPayload: { promptVietnamese: 'Chọn nghĩa đúng', choices: ['A', 'B'] },
  sequence: 1,
};

describe('placement contracts', () => {
  it('accepts answer-safe placement prompts and receipts', () => {
    expect(
      placementCatalogResponseSchema.parse({
        questionSets: [
          {
            languageCode: 'ja',
            objectiveKey: 'exam',
            placementQuestionSetId: '32000000-0000-4000-8000-000000000001',
            placementVersion: 'v1.0.0',
            questions: [question],
            titleVietnamese: 'Xác định mức Nhật ngữ',
          },
        ],
      }).questionSets[0]?.questions[0],
    ).toEqual(question);

    expect(
      placementSessionReceiptSchema.parse({
        completedAt: null,
        confidence: null,
        placementSessionId: '52000000-0000-4000-8000-000000000001',
        recommendedLevelCode: null,
        scoredAt: null,
        sessionStatus: 'submitted',
        submittedAt: '2026-08-03T00:00:00.000Z',
      }).sessionStatus,
    ).toBe('submitted');
  });

  it('rejects rubric leakage and malformed answer fields', () => {
    expect(
      placementQuestionSetSchema.safeParse({
        languageCode: 'ja',
        objectiveKey: 'exam',
        placementQuestionSetId: '32000000-0000-4000-8000-000000000001',
        placementVersion: 'v1.0.0',
        questions: [{ ...question, scoringRubric: { correctChoice: 0 } }],
        titleVietnamese: 'Không hợp lệ',
      }).success,
    ).toBe(false);
    expect(
      placementAnswerInputSchema.safeParse({
        answerPayload: { selectedChoice: 0 },
        attemptNumber: 1,
        clientRecordedAt: null,
        deviceId: '72000000-0000-4000-8000-000000000001',
        deviceSequence: 1,
        idempotencyKey: '62000000-0000-4000-8000-000000000001',
        placementQuestionId: question.placementQuestionId,
        responseTimeMs: 500,
        scoringRubric: { correctChoice: 0 },
      }).success,
    ).toBe(false);
  });
});
