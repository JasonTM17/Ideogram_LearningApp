import { createHash } from 'node:crypto';

import { serializeReviewSubmissionForIdempotency } from '@ideogram/learning-engine';
import { describe, expect, it, vi } from 'vitest';

import { ApiHttpError } from '@/server/http/api-response';

import { submitReviewEvent, type ReviewSubmissionExecutor } from './review-submission-repository';

import type { ReviewSubmissionInput } from '@ideogram/contracts';
import type { PoolClient } from 'pg';

const reviewInput: ReviewSubmissionInput = {
  deviceId: '123e4567-e89b-42d3-a456-426614174001',
  deviceSequence: 7,
  grade: 'good',
  idempotencyKey: '123e4567-e89b-42d3-a456-426614174002',
  itemId: '123e4567-e89b-42d3-a456-426614174003',
  reviewedAtClient: '2026-07-29T00:00:00.000Z',
  timezone: 'Asia/Ho_Chi_Minh',
};

const databaseReceipt = {
  algorithm_version: 'srs-v1',
  due_at: new Date('2026-07-30T00:00:00.000Z'),
  ease_factor: '2.55',
  event_id: '123e4567-e89b-42d3-a456-426614174004',
  idempotent_replay: false,
  interval_minutes: 1440,
  lapse_count: 0,
  repetition_count: 1,
  server_receipt_sequence: '8',
  state: 'review',
};

const createExecutor =
  (query: ReturnType<typeof vi.fn>): ReviewSubmissionExecutor =>
  async (operation) =>
    operation({ query } as unknown as PoolClient);

describe('review submission repository', () => {
  it('binds the verified learner and canonical server hash to a parameterized RPC', async () => {
    const query = vi.fn(async (_queryText: string, _values?: unknown[]) => ({
      rowCount: 1,
      rows: [databaseReceipt],
    }));

    await expect(
      submitReviewEvent(
        { input: reviewInput, userId: '123e4567-e89b-42d3-a456-426614174005' },
        createExecutor(query),
      ),
    ).resolves.toEqual({
      eventId: databaseReceipt.event_id,
      idempotentReplay: false,
      schedule: {
        algorithmVersion: 'srs-v1',
        dueAt: '2026-07-30T00:00:00.000Z',
        easeFactor: 2.55,
        intervalMinutes: 1440,
        lapseCount: 0,
        repetitionCount: 1,
        state: 'review',
      },
      serverReceiptSequence: 8,
    });

    const queryCall = query.mock.calls[0];
    expect(queryCall).toBeDefined();
    if (!queryCall) {
      throw new Error('Expected the review RPC query to run.');
    }
    const [queryText, values] = queryCall;
    expect(queryText).toContain('private.submit_review_event');
    expect(queryText).toContain('$9::text');
    expect(values).toEqual([
      '123e4567-e89b-42d3-a456-426614174005',
      reviewInput.itemId,
      reviewInput.idempotencyKey,
      reviewInput.deviceId,
      reviewInput.deviceSequence,
      createHash('sha256')
        .update(serializeReviewSubmissionForIdempotency(reviewInput))
        .digest('hex'),
      reviewInput.grade,
      reviewInput.reviewedAtClient,
      reviewInput.timezone,
    ]);
    expect(queryText).not.toContain(reviewInput.itemId);
  });

  it('fails closed when the database receipt violates the public contract', async () => {
    const query = vi.fn(async (_queryText: string, _values?: unknown[]) => ({
      rowCount: 1,
      rows: [{ ...databaseReceipt, interval_minutes: 0 }],
    }));

    await expect(
      submitReviewEvent(
        { input: reviewInput, userId: reviewInput.deviceId },
        createExecutor(query),
      ),
    ).rejects.toThrow();
  });

  it.each([
    ['P0002', 'Review item is not available to this learner.', 404, 'NOT_FOUND'],
    ['42501', 'Only active learner accounts may mutate learning state.', 403, 'FORBIDDEN'],
    ['23514', 'Suspended review items cannot receive review events.', 409, 'INVALID_REQUEST'],
    [
      '22023',
      'Review idempotency key was reused with a different payload.',
      409,
      'INVALID_REQUEST',
    ],
    ['22023', 'Review submission input is invalid.', 400, 'INVALID_REQUEST'],
  ])('maps PostgreSQL %s to a safe HTTP error', async (code, message, status, apiCode) => {
    const execute = async () => {
      throw Object.assign(new Error(message), { code });
    };

    let thrownError: unknown;
    try {
      await submitReviewEvent({ input: reviewInput, userId: reviewInput.deviceId }, execute);
    } catch (error) {
      thrownError = error;
    }

    expect(thrownError).toBeInstanceOf(ApiHttpError);
    expect(thrownError).toMatchObject({ code: apiCode, status });
    expect(String(thrownError)).not.toContain(message);
  });

  it('preserves unknown infrastructure errors for the route-level generic response', async () => {
    const infrastructureError = new Error('database password must remain internal');
    const execute = async () => {
      throw infrastructureError;
    };

    await expect(
      submitReviewEvent({ input: reviewInput, userId: reviewInput.deviceId }, execute),
    ).rejects.toBe(infrastructureError);
  });

  it.each(['P0002', '42501', '23514', '22023'])(
    'does not disguise an unexpected PostgreSQL %s failure as a learner error',
    async (code) => {
      const infrastructureError = Object.assign(new Error('unexpected database failure'), { code });
      const execute = async () => {
        throw infrastructureError;
      };

      await expect(
        submitReviewEvent({ input: reviewInput, userId: reviewInput.deviceId }, execute),
      ).rejects.toBe(infrastructureError);
    },
  );
});
