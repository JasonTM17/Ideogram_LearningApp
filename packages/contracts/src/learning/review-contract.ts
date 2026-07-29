import { z } from 'zod';

import { reviewGrades, reviewItemStates } from './learning-vocabulary';

export const reviewSubmissionInputSchema = z
  .object({
    deviceId: z.uuid(),
    deviceSequence: z.number().int().positive(),
    grade: z.enum(reviewGrades),
    idempotencyKey: z.uuid(),
    itemId: z.uuid(),
    reviewedAtClient: z.iso.datetime(),
    timezone: z.string().min(1).max(64),
  })
  .strict();

export const reviewScheduleSchema = z.object({
  algorithmVersion: z.string().regex(/^srs-v\d+$/u),
  dueAt: z.iso.datetime(),
  easeFactor: z.number().min(1.3).max(3.5),
  intervalMinutes: z.number().int().positive(),
  lapseCount: z.number().int().nonnegative(),
  repetitionCount: z.number().int().nonnegative(),
  state: z.enum(reviewItemStates),
});

export const reviewSubmissionReceiptSchema = z.object({
  eventId: z.uuid(),
  idempotentReplay: z.boolean(),
  schedule: reviewScheduleSchema,
  serverReceiptSequence: z.number().int().positive(),
});

export type ReviewSchedule = z.infer<typeof reviewScheduleSchema>;
export type ReviewSubmissionInput = z.infer<typeof reviewSubmissionInputSchema>;
export type ReviewSubmissionReceipt = z.infer<typeof reviewSubmissionReceiptSchema>;
