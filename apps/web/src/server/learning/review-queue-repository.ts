import { reviewQueueResponseSchema } from '@ideogram/contracts';
import { z } from 'zod';

import type { ReviewQueueResponse } from '@ideogram/contracts';
import type { SupabaseClient } from '@supabase/supabase-js';

const reviewQueueRowSchema = z
  .object({
    activity_id: z.string(),
    content_release_id: z.string(),
    due_at: z.string(),
    item_id: z.string(),
    source_item_key: z.string(),
    state: z.string(),
  })
  .strict();

const normalizeDueAt = (dueAt: string): string => {
  const parsedDueAt = new Date(dueAt);
  if (Number.isNaN(parsedDueAt.valueOf())) {
    throw new ReviewQueueRepositoryError();
  }

  return parsedDueAt.toISOString();
};

export class ReviewQueueRepositoryError extends Error {
  constructor() {
    super('Review queue data is unavailable.');
    this.name = 'ReviewQueueRepositoryError';
  }
}

export const readLearnerReviewQueue = async (
  client: SupabaseClient,
  now: Date = new Date(),
): Promise<ReviewQueueResponse> => {
  const { data, error } = await client
    .from('review_items')
    .select('item_id, content_release_id, activity_id, source_item_key, state, due_at')
    .neq('state', 'suspended')
    .lte('due_at', now.toISOString())
    .filter('source_item_key', 'match', '^vocabulary-[1-9][0-9]*$')
    .order('due_at', { ascending: true })
    .limit(50);

  if (error) {
    throw new ReviewQueueRepositoryError();
  }

  const rows = z.array(reviewQueueRowSchema).parse(data ?? []);
  return reviewQueueResponseSchema.parse({
    items: rows.map((row) => ({
      activityId: row.activity_id,
      contentReleaseId: row.content_release_id,
      dueAt: normalizeDueAt(row.due_at),
      itemId: row.item_id,
      sourceItemKey: row.source_item_key,
      state: row.state,
    })),
  });
};
