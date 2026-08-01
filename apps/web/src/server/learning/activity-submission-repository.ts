import { createHash } from 'node:crypto';

import {
  activityAttemptReceiptSchema,
  type ActivityAttemptInput,
  type ActivityAttemptReceipt,
} from '@ideogram/contracts';
import { serializeActivityAttemptForIdempotency } from '@ideogram/learning-engine';
import { z } from 'zod';

import { ApiHttpError } from '@/server/http/api-response';

import { withLearningExecutorTransaction } from './learning-executor-pool';

import type { PoolClient, QueryResultRow } from 'pg';

const nonNegativeDatabaseIntegerSchema = z
  .union([z.number().int().nonnegative(), z.bigint().nonnegative(), z.string().regex(/^\d+$/u)])
  .transform(Number);

const activitySubmissionRowSchema = z
  .object({
    attempt_id: z.uuid(),
    completed_activity_count: nonNegativeDatabaseIntegerSchema,
    completion_state: z.string(),
    idempotent_replay: z.boolean(),
    lesson_id: z.string(),
    progress_state: z.string(),
    total_activity_count: nonNegativeDatabaseIntegerSchema,
  })
  .strict();

interface ActivitySubmissionDatabaseRow extends QueryResultRow {
  attempt_id: unknown;
  completed_activity_count: unknown;
  completion_state: unknown;
  idempotent_replay: unknown;
  lesson_id: unknown;
  progress_state: unknown;
  total_activity_count: unknown;
}

export interface SubmitActivityAttemptOptions {
  input: ActivityAttemptInput;
  userId: string;
}

export type ActivitySubmissionExecutor = (
  operation: (client: PoolClient) => Promise<ActivityAttemptReceipt>,
) => Promise<ActivityAttemptReceipt>;

const submitActivityAttemptSql = `
  select
    attempt_id,
    idempotent_replay,
    lesson_id,
    completion_state,
    progress_state,
    completed_activity_count,
    total_activity_count
  from private.evaluate_and_submit_activity_attempt(
    $1::uuid, $2::text, $3::text, $4::uuid, $5::bigint,
    $6::uuid, $7::text, $8::jsonb, $9::timestamptz, $10::text
  )
`;

const createPayloadHash = (input: ActivityAttemptInput): string =>
  createHash('sha256').update(serializeActivityAttemptForIdempotency(input)).digest('hex');

const forbiddenActivityMessages = new Set([
  'Only active learner accounts may mutate learning state.',
  'Learning operations require a published active content release.',
  'Learning operations require an active enrollment for the content release.',
]);
const missingActivityMessages = new Set(['Activity is not available in the selected release.']);
const conflictingActivityMessages = new Set([
  'Activity attempt receipt is unavailable.',
  'Activity idempotency key was reused with a different payload.',
  'Device sequence was already used for another activity attempt.',
]);

const mapDatabaseError = (error: unknown): never => {
  const code =
    error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
      ? error.code
      : undefined;
  const message =
    error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
      ? error.message
      : undefined;

  if (code === 'P0002' && message && missingActivityMessages.has(message)) {
    throw new ApiHttpError({
      code: 'NOT_FOUND',
      message: 'Hoạt động học không còn khả dụng.',
      status: 404,
    });
  }
  if (
    code === 'P0002' &&
    message === 'Activity evaluator is not available for this activity type.'
  ) {
    throw new ApiHttpError({
      code: 'INVALID_REQUEST',
      message: 'Hoạt động này chưa hỗ trợ chấm tự động.',
      status: 409,
    });
  }
  if (code === '42501' && message && forbiddenActivityMessages.has(message)) {
    throw new ApiHttpError({
      code: 'FORBIDDEN',
      message: 'Bạn không thể gửi kết quả hoạt động này.',
      status: 403,
    });
  }
  if (code === '22023' && message && conflictingActivityMessages.has(message)) {
    throw new ApiHttpError({
      code: 'INVALID_REQUEST',
      message: 'Lần gửi hoạt động xung đột với một lần gửi trước đó.',
      status: 409,
    });
  }
  if (code === '22023' && message === 'Activity attempt input is invalid.') {
    throw new ApiHttpError({
      code: 'INVALID_REQUEST',
      message: 'Dữ liệu trả lời hoạt động không hợp lệ.',
      status: 400,
    });
  }

  throw error;
};

const parseReceipt = (row: unknown): ActivityAttemptReceipt => {
  const parsedRow = activitySubmissionRowSchema.parse(row);

  return activityAttemptReceiptSchema.parse({
    attemptId: parsedRow.attempt_id,
    completedActivityCount: parsedRow.completed_activity_count,
    completionState: parsedRow.completion_state,
    idempotentReplay: parsedRow.idempotent_replay,
    lessonId: parsedRow.lesson_id,
    progressState: parsedRow.progress_state,
    totalActivityCount: parsedRow.total_activity_count,
  });
};

export const submitActivityAttempt = async (
  { input, userId }: SubmitActivityAttemptOptions,
  execute: ActivitySubmissionExecutor = withLearningExecutorTransaction,
): Promise<ActivityAttemptReceipt> => {
  try {
    return await execute(async (client) => {
      const result = await client.query<ActivitySubmissionDatabaseRow>(submitActivityAttemptSql, [
        userId,
        input.contentReleaseId,
        input.activityId,
        input.deviceId,
        input.deviceSequence,
        input.idempotencyKey,
        createPayloadHash(input),
        input.responsePayload,
        input.reviewedAtClient,
        input.timezone,
      ]);

      if (result.rowCount !== 1 || result.rows.length !== 1) {
        throw new Error('Activity submission did not return exactly one receipt.');
      }

      return parseReceipt(result.rows[0]);
    });
  } catch (error) {
    return mapDatabaseError(error);
  }
};
