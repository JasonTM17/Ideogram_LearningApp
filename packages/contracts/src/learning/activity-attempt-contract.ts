import { z } from 'zod';

import { contentIdentifierSchema } from '../content/content-manifest-contract';
import { activityAttemptStates, lessonProgressStates } from './learning-vocabulary';

export const activityAttemptInputSchema = z
  .object({
    activityId: contentIdentifierSchema,
    contentReleaseId: contentIdentifierSchema,
    deviceId: z.uuid(),
    deviceSequence: z.number().int().positive(),
    idempotencyKey: z.uuid(),
    responsePayload: z.record(z.string(), z.unknown()),
    reviewedAtClient: z.iso.datetime(),
    timezone: z.string().min(1).max(64),
  })
  .strict();

export const activityAttemptReceiptSchema = z.object({
  attemptId: z.uuid(),
  completedActivityCount: z.number().int().nonnegative(),
  completionState: z.enum(activityAttemptStates),
  idempotentReplay: z.boolean(),
  lessonId: contentIdentifierSchema,
  progressState: z.enum(lessonProgressStates),
  totalActivityCount: z.number().int().nonnegative(),
});

export type ActivityAttemptInput = z.infer<typeof activityAttemptInputSchema>;
export type ActivityAttemptReceipt = z.infer<typeof activityAttemptReceiptSchema>;
