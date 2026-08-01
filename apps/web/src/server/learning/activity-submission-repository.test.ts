import { createHash } from 'node:crypto';

import { serializeActivityAttemptForIdempotency } from '@ideogram/learning-engine';
import { describe, expect, it, vi } from 'vitest';

import { ApiHttpError } from '@/server/http/api-response';

import {
  submitActivityAttempt,
  type ActivitySubmissionExecutor,
} from './activity-submission-repository';

import type { ActivityAttemptInput } from '@ideogram/contracts';
import type { PoolClient } from 'pg';

const activityInput: ActivityAttemptInput = {
  activityId: 'ja-n5-l01-vocabulary',
  contentReleaseId: 'ja-n5-pilot-v1',
  deviceId: '123e4567-e89b-42d3-a456-426614174001',
  deviceSequence: 7,
  idempotencyKey: '123e4567-e89b-42d3-a456-426614174002',
  responsePayload: { acknowledged: true },
  reviewedAtClient: '2026-07-29T00:00:00.000Z',
  timezone: 'Asia/Ho_Chi_Minh',
};

const databaseReceipt = {
  attempt_id: '123e4567-e89b-42d3-a456-426614174004',
  completed_activity_count: '1',
  completion_state: 'completed',
  idempotent_replay: false,
  lesson_id: 'ja-n5-l01',
  progress_state: 'completed',
  total_activity_count: 1,
};

const createExecutor =
  (query: ReturnType<typeof vi.fn>): ActivitySubmissionExecutor =>
  async (operation) =>
    operation({ query } as unknown as PoolClient);

describe('activity submission repository', () => {
  it('binds the verified learner and canonical server hash to the evaluated parameterized RPC', async () => {
    const query = vi.fn(async (_queryText: string, _values?: unknown[]) => ({
      rowCount: 1,
      rows: [databaseReceipt],
    }));

    await expect(
      submitActivityAttempt(
        { input: activityInput, userId: '123e4567-e89b-42d3-a456-426614174005' },
        createExecutor(query),
      ),
    ).resolves.toEqual({
      attemptId: databaseReceipt.attempt_id,
      completedActivityCount: 1,
      completionState: 'completed',
      idempotentReplay: false,
      lessonId: databaseReceipt.lesson_id,
      progressState: 'completed',
      totalActivityCount: 1,
    });

    const queryCall = query.mock.calls[0];
    expect(queryCall).toBeDefined();
    if (!queryCall) {
      throw new Error('Expected the activity RPC query to run.');
    }
    const [queryText, values] = queryCall;
    expect(queryText).toContain('private.evaluate_and_submit_activity_attempt');
    expect(queryText).toContain('$10::text');
    expect(values).toEqual([
      '123e4567-e89b-42d3-a456-426614174005',
      activityInput.contentReleaseId,
      activityInput.activityId,
      activityInput.deviceId,
      activityInput.deviceSequence,
      activityInput.idempotencyKey,
      createHash('sha256')
        .update(serializeActivityAttemptForIdempotency(activityInput))
        .digest('hex'),
      activityInput.responsePayload,
      activityInput.reviewedAtClient,
      activityInput.timezone,
    ]);
    expect(queryText).not.toContain(activityInput.activityId);
  });

  it('fails closed when the database receipt violates the public contract', async () => {
    const query = vi.fn(async (_queryText: string, _values?: unknown[]) => ({
      rowCount: 1,
      rows: [{ ...databaseReceipt, completion_state: 'forged' }],
    }));

    await expect(
      submitActivityAttempt(
        { input: activityInput, userId: activityInput.deviceId },
        createExecutor(query),
      ),
    ).rejects.toThrow();
  });

  it.each([
    ['P0002', 'Activity is not available in the selected release.', 404, 'NOT_FOUND'],
    [
      'P0002',
      'Activity evaluator is not available for this activity type.',
      409,
      'INVALID_REQUEST',
    ],
    ['42501', 'Only active learner accounts may mutate learning state.', 403, 'FORBIDDEN'],
    ['22023', 'Activity attempt receipt is unavailable.', 409, 'INVALID_REQUEST'],
    [
      '22023',
      'Activity idempotency key was reused with a different payload.',
      409,
      'INVALID_REQUEST',
    ],
    ['22023', 'Activity attempt input is invalid.', 400, 'INVALID_REQUEST'],
  ])('maps PostgreSQL %s to a safe HTTP error', async (code, message, status, apiCode) => {
    const execute = async () => {
      throw Object.assign(new Error(message), { code });
    };

    let thrownError: unknown;
    try {
      await submitActivityAttempt(
        { input: activityInput, userId: activityInput.deviceId },
        execute,
      );
    } catch (error) {
      thrownError = error;
    }

    expect(thrownError).toBeInstanceOf(ApiHttpError);
    expect(thrownError).toMatchObject({ code: apiCode, status });
    expect(String(thrownError)).not.toContain(message);
  });

  it('preserves unknown infrastructure errors for the route-level generic response', async () => {
    const infrastructureError = new Error('internal activity content must remain private');
    const execute = async () => {
      throw infrastructureError;
    };

    await expect(
      submitActivityAttempt({ input: activityInput, userId: activityInput.deviceId }, execute),
    ).rejects.toBe(infrastructureError);
  });

  it.each(['P0002', '42501', '22023'])(
    'does not disguise an unexpected PostgreSQL %s failure as a learner error',
    async (code) => {
      const infrastructureError = Object.assign(new Error('unexpected database failure'), { code });
      const execute = async () => {
        throw infrastructureError;
      };

      await expect(
        submitActivityAttempt({ input: activityInput, userId: activityInput.deviceId }, execute),
      ).rejects.toBe(infrastructureError);
    },
  );
});
