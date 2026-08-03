import { describe, expect, it } from 'vitest';

import { reviewQueueResponseSchema } from './review-queue-contract';

const item = {
  activityId: 'greeting-vocabulary',
  contentReleaseId: 'japanese-n5-v1',
  dueAt: '2026-08-03T07:00:00.000Z',
  itemId: '123e4567-e89b-42d3-a456-426614174003',
  sourceItemKey: 'vocabulary-1',
  state: 'learning',
} as const;

describe('review queue contract', () => {
  it('accepts the bounded answer-free review queue shape', () => {
    expect(reviewQueueResponseSchema.parse({ items: [item] })).toEqual({ items: [item] });
  });

  it('rejects malformed source keys, timestamps, and unexpected fields', () => {
    expect(
      reviewQueueResponseSchema.safeParse({
        items: [{ ...item, dueAt: 'tomorrow', sourceItemKey: 'Vocabulary 1' }],
      }).success,
    ).toBe(false);
    expect(
      reviewQueueResponseSchema.safeParse({ items: [{ ...item, userId: 'leak' }] }).success,
    ).toBe(false);
  });
});
