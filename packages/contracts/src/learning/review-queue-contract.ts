import { z } from 'zod';

import { contentIdentifierSchema } from '../content/content-manifest-contract';
import { reviewItemStates } from './learning-vocabulary';

const reviewSourceItemKeySchema = z.string().regex(/^[a-z0-9][a-z0-9-]{1,118}$/u);

export const reviewQueueItemSchema = z
  .object({
    activityId: contentIdentifierSchema,
    contentReleaseId: contentIdentifierSchema,
    dueAt: z.iso.datetime(),
    itemId: z.uuid(),
    sourceItemKey: reviewSourceItemKeySchema,
    state: z.enum(reviewItemStates),
  })
  .strict();

export const reviewQueueResponseSchema = z
  .object({ items: z.array(reviewQueueItemSchema).max(50) })
  .strict();

export type ReviewQueueItem = z.infer<typeof reviewQueueItemSchema>;
export type ReviewQueueResponse = z.infer<typeof reviewQueueResponseSchema>;
