import { describe, expect, it } from 'vitest';

import {
  reviewNextScheduleSchema,
  reviewScheduleSchema,
  reviewSubmissionInputSchema,
} from './review-contract';

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

  it('allows only an unseen learning item to use a zero persisted interval', () => {
    const unseenSchedule = {
      algorithmVersion: 'srs-v1',
      dueAt: '2026-07-29T00:00:00.000Z',
      easeFactor: 2.3,
      intervalMinutes: 0,
      lapseCount: 0,
      repetitionCount: 0,
      state: 'learning',
    };

    expect(reviewScheduleSchema.safeParse(unseenSchedule).success).toBe(true);
    expect(reviewNextScheduleSchema.safeParse(unseenSchedule).success).toBe(false);
    expect(reviewScheduleSchema.safeParse({ ...unseenSchedule, state: 'suspended' }).success).toBe(
      true,
    );
    expect(reviewScheduleSchema.safeParse({ ...unseenSchedule, state: 'review' }).success).toBe(
      false,
    );
  });

  it('rejects unsupported scheduler versions and ease factors with excess precision', () => {
    const schedule = {
      algorithmVersion: 'srs-v1',
      dueAt: '2026-07-29T00:00:00.000Z',
      easeFactor: 2.3,
      intervalMinutes: 10,
      lapseCount: 0,
      repetitionCount: 1,
      state: 'learning',
    };

    expect(
      reviewScheduleSchema.safeParse({ ...schedule, algorithmVersion: 'srs-v2' }).success,
    ).toBe(false);
    expect(reviewScheduleSchema.safeParse({ ...schedule, easeFactor: 2.333 }).success).toBe(false);
  });
});
