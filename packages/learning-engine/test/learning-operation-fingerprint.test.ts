import { describe, expect, it } from 'vitest';

import {
  serializeActivityAttemptForIdempotency,
  serializeReviewSubmissionForIdempotency,
} from '../src/learning-operation-fingerprint';

describe('learning operation fingerprint material', () => {
  it('makes equivalent activity response objects hash identically across key order', () => {
    const base = {
      activityId: 'ja-n5-u1-l1-vocab',
      contentReleaseId: 'ja-n5-pilot-v1',
      deviceId: '123e4567-e89b-42d3-a456-426614174001',
      deviceSequence: 1,
      idempotencyKey: '123e4567-e89b-42d3-a456-426614174002',
      reviewedAtClient: '2026-07-29T00:00:00.000Z',
      timezone: 'Asia/Ho_Chi_Minh',
    };

    expect(
      serializeActivityAttemptForIdempotency({ ...base, responsePayload: { b: 'two', a: 'one' } }),
    ).toBe(
      serializeActivityAttemptForIdempotency({ ...base, responsePayload: { a: 'one', b: 'two' } }),
    );
  });

  it('binds the review grade and item to the server hash material', () => {
    const base = {
      deviceId: '123e4567-e89b-42d3-a456-426614174001',
      deviceSequence: 1,
      grade: 'good' as const,
      idempotencyKey: '123e4567-e89b-42d3-a456-426614174002',
      itemId: '123e4567-e89b-42d3-a456-426614174003',
      reviewedAtClient: '2026-07-29T00:00:00.000Z',
      timezone: 'Asia/Ho_Chi_Minh',
    };

    expect(serializeReviewSubmissionForIdempotency(base)).not.toBe(
      serializeReviewSubmissionForIdempotency({ ...base, grade: 'easy' }),
    );
  });
});
