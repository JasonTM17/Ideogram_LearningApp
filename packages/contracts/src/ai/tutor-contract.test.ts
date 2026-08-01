import { describe, expect, it } from 'vitest';

import {
  tutorTurnInputSchema,
  tutorTurnRequestSchema,
  tutorTurnResponseSchema,
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
