import { describe, expect, it } from 'vitest';

import { createTutorTurnApiRequest, parseTutorTurnApiResponse } from './tutor-api-requests';

const request = {
  conversationId: '123e4567-e89b-42d3-a456-426614174000',
  learnerPreference: {
    explanationDepth: 'standard',
    preferredLanguageCode: 'ja',
    preferredObjectiveKey: 'communication',
    tone: 'encouraging',
  },
  message: 'Vì sao dùng は?',
  targetLevelCode: 'N5',
  turnId: '123e4567-e89b-42d3-a456-426614174001',
} as const;

const receipt = {
  conversationId: request.conversationId,
  idempotentReplay: false,
  response: {
    assessmentVietnamese: 'Đúng hướng.',
    example: 'これは本です。',
    explanationVietnamese: 'は đánh dấu chủ đề.',
    frequentVietnameseMistake: 'Không đồng nhất は với chủ ngữ.',
    nextExerciseVietnamese: 'Đặt một câu với は.',
    sourceBoundaryVietnamese: 'Chưa có nguồn bài học trong lượt này.',
  },
  state: 'completed',
  turnId: request.turnId,
  usage: { completionTokens: 2, promptTokens: 3, totalTokens: 5 },
} as const;

describe('tutor API request contract', () => {
  it('builds the versioned POST request from a validated public body', () => {
    expect(createTutorTurnApiRequest(request)).toEqual({
      body: request,
      method: 'POST',
      path: '/api/v1/ai/tutor/turn',
    });
  });

  it('rejects malformed or cross-language requests before transport', () => {
    expect(() => createTutorTurnApiRequest({ ...request, message: '' })).toThrow();
    expect(() => createTutorTurnApiRequest({ ...request, targetLevelCode: 'HSK_1' })).toThrow();
  });

  it('parses only the bounded completed receipt contract', () => {
    expect(parseTutorTurnApiResponse(receipt)).toEqual(receipt);
    expect(() => parseTutorTurnApiResponse({ ...receipt, privateNote: 'secret' })).toThrow();
  });
});
