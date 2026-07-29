import { z } from 'zod';

import {
  maxReviewIntervalMinutes,
  reviewAlgorithmVersions,
  reviewGrades,
  reviewItemStates,
} from './learning-vocabulary';

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

const hasAtMostTwoDecimalPlaces = (value: number): boolean =>
  Math.abs(value * 100 - Math.round(value * 100)) < 1e-9;

const reviewScheduleBaseSchema = z.object({
  algorithmVersion: z.enum(reviewAlgorithmVersions),
  dueAt: z.iso.datetime(),
  easeFactor: z.number().min(1.3).max(3.5).refine(hasAtMostTwoDecimalPlaces, {
    message: 'Ease factor must use at most two decimal places.',
  }),
  intervalMinutes: z.number().int().nonnegative().max(maxReviewIntervalMinutes),
  lapseCount: z.number().int().nonnegative(),
  repetitionCount: z.number().int().nonnegative(),
  state: z.enum(reviewItemStates),
});

/**
 * Persisted schedules permit an unseen learning item to have a zero interval.
 * Every schedule returned after a review event must use a positive interval.
 */
export const reviewScheduleSchema = reviewScheduleBaseSchema.superRefine((schedule, context) => {
  if (schedule.intervalMinutes === 0 && schedule.state !== 'learning') {
    context.addIssue({
      code: 'custom',
      message: 'A zero interval is only valid for an unreviewed learning item.',
      path: ['intervalMinutes'],
    });
  }
});

export const reviewNextScheduleSchema = reviewScheduleSchema.refine(
  (schedule) => schedule.intervalMinutes > 0,
  {
    message: 'A review receipt must contain a positive next interval.',
    path: ['intervalMinutes'],
  },
);

export const reviewSubmissionReceiptSchema = z.object({
  eventId: z.uuid(),
  idempotentReplay: z.boolean(),
  schedule: reviewNextScheduleSchema,
  serverReceiptSequence: z.number().int().positive(),
});

export type ReviewSchedule = z.infer<typeof reviewScheduleSchema>;
export type ReviewSubmissionInput = z.infer<typeof reviewSubmissionInputSchema>;
export type ReviewSubmissionReceipt = z.infer<typeof reviewSubmissionReceiptSchema>;
