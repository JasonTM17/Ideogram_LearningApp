import { describe, expect, it, vi } from 'vitest';

import {
  createWebReviewSubmissionInput,
  describeWebReviewError,
  submitWebReview,
  WebReviewError,
} from './review-submission-client';

const input = {
  deviceId: '123e4567-e89b-42d3-a456-426614174001',
  deviceSequence: 7,
  grade: 'good',
  idempotencyKey: '123e4567-e89b-42d3-a456-426614174002',
  itemId: '123e4567-e89b-42d3-a456-426614174003',
  reviewedAtClient: '2026-08-03T07:00:00.000Z',
  timezone: 'Asia/Ho_Chi_Minh',
} as const;

const receipt = {
  eventId: '123e4567-e89b-42d3-a456-426614174004',
  idempotentReplay: false,
  schedule: {
    algorithmVersion: 'srs-v1',
    dueAt: '2026-08-04T07:00:00.000Z',
    easeFactor: 2.3,
    intervalMinutes: 1440,
    lapseCount: 0,
    repetitionCount: 1,
    state: 'review',
  },
  serverReceiptSequence: 1,
} as const;

const response = (status: number, payload: unknown = receipt, contentType = 'application/json') =>
  new Response(JSON.stringify(payload), { headers: { 'content-type': contentType }, status });

describe('web review submission client', () => {
  it('builds the public review payload from one reserved browser identity', () => {
    expect(
      createWebReviewSubmissionInput({
        createIdempotencyKey: () => input.idempotencyKey,
        grade: input.grade,
        identity: { deviceId: input.deviceId, deviceSequence: input.deviceSequence },
        itemId: input.itemId,
        now: new Date(input.reviewedAtClient),
        timezone: input.timezone,
      }),
    ).toEqual(input);
  });

  it('posts no-store cookie-authenticated JSON and validates the receipt', async () => {
    const fetchImplementation = vi.fn().mockResolvedValue(response(200));
    await expect(submitWebReview(input, { fetchImplementation })).resolves.toEqual(receipt);
    expect(fetchImplementation).toHaveBeenCalledWith(
      '/api/v1/learning/reviews/submit',
      expect.objectContaining({ credentials: 'same-origin', method: 'POST', redirect: 'error' }),
    );
  });

  it.each([
    [401, 'UNAUTHORIZED'],
    [404, 'ITEM_UNAVAILABLE'],
    [409, 'INVALID_REQUEST'],
    [503, 'SERVER_ERROR'],
  ] as const)('maps HTTP %i to the matching opaque error', async (status, code) => {
    await expect(
      submitWebReview(input, { fetchImplementation: vi.fn().mockResolvedValue(response(status)) }),
    ).rejects.toEqual(expect.objectContaining({ code, status }));
  });

  it('keeps only uncertain outcomes retryable and rejects malformed success bodies', async () => {
    expect(describeWebReviewError(new WebReviewError('NETWORK_ERROR'))).toMatchObject({
      retryable: true,
    });
    expect(describeWebReviewError(new WebReviewError('ITEM_UNAVAILABLE'))).toMatchObject({
      retryable: false,
    });
    await expect(
      submitWebReview(input, {
        fetchImplementation: vi.fn().mockResolvedValue(response(200, {}, 'text/html')),
      }),
    ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });
});
