import { describe, expect, it } from 'vitest';

import { reviewSubmissionInputSchema } from './review-contract';

describe('review submission contract', () => {
  const validInput = {
    deviceId: '123e4567-e89b-42d3-a456-426614174001',
    deviceSequence: 4,
    grade: 'good',
    idempotencyKey: '123e4567-e89b-42d3-a456-426614174002',
    itemId: '123e4567-e89b-42d3-a456-426614174003',
    reviewedAtClient: '2026-07-29T00:00:00.000Z',
    timezone: 'Asia/Ho_Chi_Minh',
  };

  it('accepts a device-sequenced review submission', () => {
    expect(reviewSubmissionInputSchema.parse(validInput)).toEqual(validInput);
  });

  it('rejects a client-supplied internal payload hash', () => {
    expect(
      reviewSubmissionInputSchema.safeParse({ ...validInput, payloadHash: 'a'.repeat(64) }).success,
    ).toBe(false);
  });
});
