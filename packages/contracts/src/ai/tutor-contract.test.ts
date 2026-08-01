import { describe, expect, it } from 'vitest';

import {
  tutorTurnInputSchema,
  tutorTurnRequestSchema,
  tutorTurnResponseSchema,
  tutorTurnReceiptSchema,
  tutorTurnUsageSchema,
} from './tutor-contract';

describe('Vietnamese tutor contracts', () => {
  it('accepts a bounded Vietnamese learner turn and preference', () => {
    expect(
      tutorTurnInputSchema.parse({
        learnerPreference: {
          explanationDepth: 'detailed',
          preferredLanguageCode: 'ja',
          preferredObjectiveKey: 'communication',
          tone: 'encouraging',
        },
        message: 'Vì sao câu này dùng は thay vì が?',
        targetLevelCode: 'N5',
      }),
    ).toMatchObject({ targetLevelCode: 'N5' });
  });

  it('rejects an undeclared field before a provider is called', () => {
    expect(() =>
      tutorTurnResponseSchema.parse({
        assessmentVietnamese: 'Đúng hướng.',
        example: 'これは本です。',
        explanationVietnamese: 'は đánh dấu chủ đề.',
        frequentVietnameseMistake: 'Không đồng nhất は với chủ ngữ.',
        nextExerciseVietnamese: 'Đặt một câu với は.',
        sourceBoundaryVietnamese: 'Dựa trên nội dung đã xuất bản.',
        toolCall: 'drop database',
      }),
    ).toThrow();
  });

  it('rejects a level from a different language pack', () => {
    expect(() =>
      tutorTurnInputSchema.parse({
        learnerPreference: {
          explanationDepth: 'standard',
          preferredLanguageCode: 'ja',
          preferredObjectiveKey: 'communication',
          tone: 'encouraging',
        },
        message: 'Giải thích giúp mình.',
        targetLevelCode: 'HSK_1',
      }),
    ).toThrow();
  });

  it('requires usage totals to be internally consistent', () => {
    expect(() =>
      tutorTurnUsageSchema.parse({ completionTokens: 2, promptTokens: 3, totalTokens: 99 }),
    ).toThrow();
  });

  it('accepts a completed replay-safe receipt', () => {
    expect(
      tutorTurnReceiptSchema.parse({
        conversationId: '123e4567-e89b-42d3-a456-426614174000',
        idempotentReplay: false,
        response: {
          assessmentVietnamese: 'Đúng hướng.',
          example: 'これは本です。',
          explanationVietnamese: 'は đánh dấu chủ đề.',
          frequentVietnameseMistake: 'Không đồng nhất は với chủ ngữ.',
          nextExerciseVietnamese: 'Đặt một câu với は.',
          sourceBoundaryVietnamese: 'Chưa có nguồn bài học.',
        },
        state: 'completed',
        turnId: '123e4567-e89b-42d3-a456-426614174001',
        usage: { completionTokens: 2, promptTokens: 3, totalTokens: 5 },
      }),
    ).toMatchObject({ state: 'completed' });
  });

  it('requires stable turn and conversation identities for an idempotent API turn', () => {
    expect(() =>
      tutorTurnRequestSchema.parse({
        conversationId: 'not-a-uuid',
        learnerPreference: {
          explanationDepth: 'concise',
          preferredLanguageCode: 'ko',
          preferredObjectiveKey: 'travel',
          tone: 'direct',
        },
        message: '도와주세요',
        targetLevelCode: 'TOPIK-1',
        turnId: 'also-not-a-uuid',
      }),
    ).toThrow();
  });
});
