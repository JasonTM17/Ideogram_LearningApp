import { describe, expect, it, vi } from 'vitest';

import { readLearnerReviewQueue, ReviewQueueRepositoryError } from './review-queue-repository';

import type { SupabaseClient } from '@supabase/supabase-js';

const createClient = (result: { data: unknown; error: unknown }) => {
  const limit = vi.fn(async () => result);
  const order = vi.fn(() => ({ limit }));
  const filter = vi.fn(() => ({ order }));
  const lte = vi.fn(() => ({ filter }));
  const neq = vi.fn(() => ({ lte }));
  const select = vi.fn(() => ({ neq }));
  const from = vi.fn(() => ({ select }));
  return {
    client: { from } as unknown as SupabaseClient,
    from,
    filter,
    limit,
    lte,
    neq,
    order,
    select,
  };
};

describe('review queue repository', () => {
  it('reads only non-suspended owned items in due order and validates their public shape', async () => {
    const fixture = createClient({
      data: [
        {
          activity_id: 'greeting-vocabulary',
          content_release_id: 'japanese-n5-v1',
          due_at: '2026-08-03T07:00:00+00:00',
          item_id: '123e4567-e89b-42d3-a456-426614174003',
          source_item_key: 'vocabulary-1',
          state: 'learning',
        },
      ],
      error: null,
    });

    await expect(
      readLearnerReviewQueue(fixture.client, new Date('2026-08-03T08:00:00.000Z')),
    ).resolves.toEqual({
      items: [
        {
          activityId: 'greeting-vocabulary',
          contentReleaseId: 'japanese-n5-v1',
          dueAt: '2026-08-03T07:00:00.000Z',
          itemId: '123e4567-e89b-42d3-a456-426614174003',
          sourceItemKey: 'vocabulary-1',
          state: 'learning',
        },
      ],
    });

    expect(fixture.from).toHaveBeenCalledWith('review_items');
    expect(fixture.select).toHaveBeenCalledWith(
      'item_id, content_release_id, activity_id, source_item_key, state, due_at',
    );
    expect(fixture.neq).toHaveBeenCalledWith('state', 'suspended');
    expect(fixture.lte).toHaveBeenCalledWith('due_at', '2026-08-03T08:00:00.000Z');
    expect(fixture.filter).toHaveBeenCalledWith(
      'source_item_key',
      'match',
      '^vocabulary-[1-9][0-9]*$',
    );
    expect(fixture.order).toHaveBeenCalledWith('due_at', { ascending: true });
    expect(fixture.limit).toHaveBeenCalledWith(50);
  });

  it('does not silently turn a database failure into an empty queue', async () => {
    await expect(
      readLearnerReviewQueue(createClient({ data: null, error: { message: 'denied' } }).client),
    ).rejects.toBeInstanceOf(ReviewQueueRepositoryError);
  });

  it('rejects malformed database rows before a review UI can render them', async () => {
    await expect(
      readLearnerReviewQueue(
        createClient({
          data: [
            {
              activity_id: 'greeting-vocabulary',
              content_release_id: 'japanese-n5-v1',
              due_at: 'not-a-date',
              item_id: '123e4567-e89b-42d3-a456-426614174003',
              source_item_key: 'vocabulary-1',
              state: 'learning',
            },
          ],
          error: null,
        }).client,
      ),
    ).rejects.toThrow();
  });
});
