import { describe, expect, it, vi } from 'vitest';

import { submitWebTutorTurn, WebTutorTurnError } from './tutor-turn-client';

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

const response = (status: number, payload: unknown = receipt, contentType = 'application/json') =>
  new Response(JSON.stringify(payload), { headers: { 'content-type': contentType }, status });

describe('web tutor turn client', () => {
  it('sends cookie-authenticated JSON and parses the shared receipt', async () => {
    const fetchImplementation = vi.fn().mockResolvedValue(response(200));

    await expect(submitWebTutorTurn(request, { fetchImplementation })).resolves.toEqual(receipt);
    expect(fetchImplementation).toHaveBeenCalledWith(
      '/api/v1/ai/tutor/turn',
      expect.objectContaining({
        credentials: 'same-origin',
        method: 'POST',
        redirect: 'error',
      }),
    );
    expect(JSON.parse(fetchImplementation.mock.calls[0]?.[1].body)).toEqual(request);
  });

  it('rejects invalid input before network access', async () => {
    const fetchImplementation = vi.fn();

    await expect(
      submitWebTutorTurn({ ...request, message: '' }, { fetchImplementation }),
    ).rejects.toMatchObject({ code: 'INVALID_REQUEST' });
    expect(fetchImplementation).not.toHaveBeenCalled();
  });

  it.each([
    [401, 'UNAUTHORIZED'],
    [403, 'FORBIDDEN'],
    [429, 'RATE_LIMITED'],
    [503, 'SERVER_ERROR'],
  ] as const)('maps HTTP %i to an opaque %s error', async (status, code) => {
    await expect(
      submitWebTutorTurn(request, {
        fetchImplementation: vi.fn().mockResolvedValue(response(status)),
      }),
    ).rejects.toEqual(expect.objectContaining({ code, status }));
  });

  it('rejects non-JSON and malformed receipts without exposing response details', async () => {
    await expect(
      submitWebTutorTurn(request, {
        fetchImplementation: vi.fn().mockResolvedValue(response(200, { secret: 'nope' })),
      }),
    ).rejects.toBeInstanceOf(WebTutorTurnError);
    await expect(
      submitWebTutorTurn(request, {
        fetchImplementation: vi.fn().mockResolvedValue(response(200, receipt, 'text/html')),
      }),
    ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });
});
