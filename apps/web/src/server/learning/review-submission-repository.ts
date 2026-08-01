import { createHash } from 'node:crypto';

import {
  reviewSubmissionReceiptSchema,
  type ReviewSubmissionInput,
  type ReviewSubmissionReceipt,
} from '@ideogram/contracts';
import { serializeReviewSubmissionForIdempotency } from '@ideogram/learning-engine';
import { z } from 'zod';

import { ApiHttpError } from '@/server/http/api-response';

import { withLearningExecutorTransaction } from './learning-executor-pool';

import type { PoolClient, QueryResultRow } from 'pg';

const positiveDatabaseIntegerSchema = z
  .union([z.number().int().positive(), z.bigint().positive(), z.string().regex(/^[1-9]\d*$/u)])
  .transform((value) => {
    const integerValue = typeof value === 'bigint' ? value : BigInt(value);
    if (integerValue > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new TypeError('Database integer exceeds the JavaScript safe integer range.');
    }
    return Number(integerValue);
  });

const nonNegativeDatabaseIntegerSchema = z
  .union([z.number().int().nonnegative(), z.bigint().nonnegative(), z.string().regex(/^\d+$/u)])
  .transform(Number);

const databaseDecimalSchema = z
  .union([z.number().finite(), z.string().regex(/^\d+(?:\.\d+)?$/u)])
  .transform(Number);

const databaseTimestampSchema = z
  .union([z.date(), z.string()])
  .transform((value) =>
    value instanceof Date ? value.toISOString() : new Date(value).toISOString(),
  );

const reviewSubmissionRowSchema = z
  .object({
    algorithm_version: z.string(),
    due_at: databaseTimestampSchema,
    ease_factor: databaseDecimalSchema,
    event_id: z.uuid(),
    idempotent_replay: z.boolean(),
    interval_minutes: nonNegativeDatabaseIntegerSchema,
    lapse_count: nonNegativeDatabaseIntegerSchema,
    repetition_count: nonNegativeDatabaseIntegerSchema,
    server_receipt_sequence: positiveDatabaseIntegerSchema,
    state: z.string(),
  })
  .strict();

interface ReviewSubmissionDatabaseRow extends QueryResultRow {
  algorithm_version: unknown;
  due_at: unknown;
  ease_factor: unknown;
  event_id: unknown;
  idempotent_replay: unknown;
  interval_minutes: unknown;
  lapse_count: unknown;
  repetition_count: unknown;
  server_receipt_sequence: unknown;
  state: unknown;
}

export interface SubmitReviewEventOptions {
  input: ReviewSubmissionInput;
  userId: string;
}

export type ReviewSubmissionExecutor = (
  operation: (client: PoolClient) => Promise<ReviewSubmissionReceipt>,
) => Promise<ReviewSubmissionReceipt>;

const submitReviewEventSql = `
  select
    event_id,
    idempotent_replay,
    server_receipt_sequence,
    algorithm_version,
    due_at,
    ease_factor,
    interval_minutes,
    lapse_count,
    repetition_count,
    state
  from private.submit_review_event(
    $1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::bigint,
    $6::text, $7::text, $8::timestamptz, $9::text
  )
`;

const createPayloadHash = (input: ReviewSubmissionInput): string =>
  createHash('sha256').update(serializeReviewSubmissionForIdempotency(input)).digest('hex');

const forbiddenReviewMessages = new Set([
  'Only active learner accounts may mutate learning state.',
  'Learning operations require a published active content release.',
  'Learning operations require an active enrollment for the content release.',
]);
const missingReviewItemMessages = new Set([
  'Review item is not available to this learner.',
  'Review item changed while the operation was being validated.',
]);
const conflictingReviewMessages = new Set([
  'Review idempotency key was reused with a different payload.',
  'Device sequence was already used for another review event.',
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

  if (code === 'P0002' && message && missingReviewItemMessages.has(message)) {
    throw new ApiHttpError({
      code: 'NOT_FOUND',
      message: 'Mục ôn tập không còn khả dụng.',
      status: 404,
    });
  }
  if (code === '42501' && message && forbiddenReviewMessages.has(message)) {
    throw new ApiHttpError({
      code: 'FORBIDDEN',
      message: 'Bạn không thể cập nhật mục ôn tập này.',
      status: 403,
    });
  }
  if (code === '23514' && message === 'Suspended review items cannot receive review events.') {
    throw new ApiHttpError({
      code: 'INVALID_REQUEST',
      message: 'Mục ôn tập đang ở trạng thái không thể cập nhật.',
      status: 409,
    });
  }
  if (code === '22023' && message && conflictingReviewMessages.has(message)) {
    throw new ApiHttpError({
      code: 'INVALID_REQUEST',
      message: 'Thao tác ôn tập xung đột với một lần gửi trước đó.',
      status: 409,
    });
  }
  if (code === '22023' && message === 'Review submission input is invalid.') {
    throw new ApiHttpError({
      code: 'INVALID_REQUEST',
      message: 'Dữ liệu ôn tập không hợp lệ.',
      status: 400,
    });
  }

  throw error;
};

const parseReceipt = (row: unknown): ReviewSubmissionReceipt => {
  const parsedRow = reviewSubmissionRowSchema.parse(row);

  return reviewSubmissionReceiptSchema.parse({
    eventId: parsedRow.event_id,
    idempotentReplay: parsedRow.idempotent_replay,
    schedule: {
      algorithmVersion: parsedRow.algorithm_version,
      dueAt: parsedRow.due_at,
      easeFactor: parsedRow.ease_factor,
      intervalMinutes: parsedRow.interval_minutes,
      lapseCount: parsedRow.lapse_count,
      repetitionCount: parsedRow.repetition_count,
      state: parsedRow.state,
    },
    serverReceiptSequence: parsedRow.server_receipt_sequence,
  });
};

export const submitReviewEvent = async (
  { input, userId }: SubmitReviewEventOptions,
  execute: ReviewSubmissionExecutor = withLearningExecutorTransaction,
): Promise<ReviewSubmissionReceipt> => {
  try {
    return await execute(async (client) => {
      const result = await client.query<ReviewSubmissionDatabaseRow>(submitReviewEventSql, [
        userId,
        input.itemId,
        input.idempotencyKey,
        input.deviceId,
        input.deviceSequence,
        createPayloadHash(input),
        input.grade,
        input.reviewedAtClient,
        input.timezone,
      ]);

      if (result.rowCount !== 1 || result.rows.length !== 1) {
        throw new Error('Review submission did not return exactly one receipt.');
      }

      return parseReceipt(result.rows[0]);
    });
  } catch (error) {
    return mapDatabaseError(error);
  }
};
