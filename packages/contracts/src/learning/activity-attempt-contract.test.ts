import { describe, expect, it } from 'vitest';

import { activityAttemptInputSchema } from './activity-attempt-contract';

describe('activity attempt contract', () => {
  const validInput = {
    activityId: 'ja-n5-u1-l1-vocab',
    contentReleaseId: 'ja-n5-pilot-v1',
    deviceId: '123e4567-e89b-42d3-a456-426614174001',
    deviceSequence: 9,
    idempotencyKey: '123e4567-e89b-42d3-a456-426614174002',
    responsePayload: { answer: '私' },
    reviewedAtClient: '2026-07-29T00:00:00.000Z',
    timezone: 'Asia/Ho_Chi_Minh',
  };

  it('accepts a device-sequenced activity response', () => {
    expect(activityAttemptInputSchema.parse(validInput)).toEqual(validInput);
  });

  it('rejects server-owned evaluation fields from the client payload', () => {
    expect(activityAttemptInputSchema.safeParse({ ...validInput, score: 1 }).success).toBe(false);
  });
});
