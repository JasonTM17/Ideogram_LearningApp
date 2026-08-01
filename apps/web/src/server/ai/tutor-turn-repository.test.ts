import { createHash } from 'node:crypto';

import { serializeTutorTurnForIdempotency } from '@ideogram/contracts';
import { describe, expect, it, vi } from 'vitest';

import {
  beginTutorTurn,
  completeTutorTurn,
  failTutorTurn,
  readTutorTurnReplay,
  type TutorTurnExecutor,
} from './tutor-turn-repository';

import type { PoolClient } from 'pg';

type FakeQuery = (
  queryText: string,
  values?: unknown[],
) => Promise<{ rowCount: number; rows: Array<Record<string, unknown>> }>;

const request = {
  conversationId: '123e4567-e89b-42d3-a456-426614174001',
  learnerPreference: {
    explanationDepth: 'standard' as const,
    preferredLanguageCode: 'ja' as const,
    preferredObjectiveKey: 'communication' as const,
    tone: 'encouraging' as const,
  },
  message: 'Vì sao dùng は?',
  targetLevelCode: 'N5',
  turnId: '123e4567-e89b-42d3-a456-426614174002',
};
const userId = '123e4567-e89b-42d3-a456-426614174000';
const payloadHash = createHash('sha256')
  .update(serializeTutorTurnForIdempotency(request))
  .digest('hex');
const response = {
  assessmentVietnamese: 'Đúng hướng.',
  example: 'これは本です。',
  explanationVietnamese: 'は đánh dấu chủ đề.',
  frequentVietnameseMistake: 'Không đồng nhất は với chủ ngữ.',
  nextExerciseVietnamese: 'Đặt một câu với は.',
  sourceBoundaryVietnamese: 'Chưa có nguồn bài học.',
};
const usage = { completionTokens: 20, promptTokens: 30, totalTokens: 50 } as const;
const leaseToken = '123e4567-e89b-42d3-a456-426614174003';

const pendingRow = {
  completion_tokens: null,
  conversation_id: request.conversationId,
  estimated_cost_microusd: '0',
  idempotent_replay: false,
  lease_token: leaseToken,
  prompt_tokens: null,
  response_payload: null,
  state: 'pending',
  total_tokens: null,
  turn_id: request.turnId,
};
const completedRow = {
  ...pendingRow,
  completion_tokens: '20',
  estimated_cost_microusd: '123',
  prompt_tokens: '30',
  response_payload: response,
  state: 'completed',
  total_tokens: '50',
};

const createExecutor =
  (query: ReturnType<typeof vi.fn>): TutorTurnExecutor =>
  async (operation) =>
    operation({ query } as unknown as PoolClient);

const createQuery = (rows: Array<Record<string, unknown>>): ReturnType<typeof vi.fn<FakeQuery>> =>
  vi.fn<FakeQuery>(async () => ({ rowCount: 1, rows }));

describe('AI tutor turn repository', () => {
  it('binds identity, canonical hash, preference, and consent policy to begin SQL', async () => {
    const query = createQuery([pendingRow]);

    await expect(
      beginTutorTurn(
        {
          consentPolicyKey: 'ai-tutor-provider-processing-v1',
          request,
          userId,
        },
        createExecutor(query),
      ),
    ).resolves.toEqual({
      conversationId: request.conversationId,
      idempotentReplay: false,
      leaseToken,
      state: 'pending',
      turnId: request.turnId,
    });

    const call = query.mock.calls[0];
    expect(call).toBeDefined();
    if (!call) throw new Error('Expected begin SQL to run.');
    const [sql, values] = call;
    expect(sql).toContain('private.begin_ai_tutor_turn_v2');
    expect(values).toEqual([
      userId,
      request.conversationId,
      request.turnId,
      payloadHash,
      serializeTutorTurnForIdempotency(request),
      serializeTutorTurnForIdempotency(request),
      'ja',
      'N5',
      'communication',
      'standard',
      'encouraging',
      'ai-tutor-provider-processing-v1',
    ]);
    expect(sql).not.toContain(request.message);
  });

  it('turns a completed DB row into the shared replay-safe receipt', async () => {
    await expect(
      beginTutorTurn(
        {
          consentPolicyKey: 'ai-tutor-provider-processing-v1',
          request,
          userId,
        },
        createExecutor(createQuery([{ ...completedRow, idempotent_replay: true }])),
      ),
    ).resolves.toMatchObject({
      idempotentReplay: true,
      receipt: { idempotentReplay: true, state: 'completed', usage },
      state: 'completed',
    });
  });

  it('reads a completed replay without requiring a new-turn reservation', async () => {
    const query = createQuery([{ ...completedRow, idempotent_replay: true }]);

    await expect(
      readTutorTurnReplay({ request, userId }, createExecutor(query)),
    ).resolves.toMatchObject({ idempotentReplay: true, state: 'completed', usage });

    expect(query.mock.calls[0]?.[0]).toContain('private.read_ai_tutor_turn_replay');
    expect(query.mock.calls[0]?.[1]).toEqual([
      userId,
      request.conversationId,
      request.turnId,
      payloadHash,
    ]);
  });

  it('finalizes provider usage and cost through the second short SQL boundary', async () => {
    const query = createQuery([completedRow]);

    await expect(
      completeTutorTurn(
        {
          configurationVersion: 'deepseek-v4-flash:high:disabled',
          conversationId: request.conversationId,
          estimatedCostMicrousd: 123,
          leaseToken,
          providerModel: 'deepseek-v4-flash',
          request,
          response,
          usage,
          userId,
        },
        createExecutor(query),
      ),
    ).resolves.toMatchObject({
      idempotentReplay: false,
      response,
      usage,
    });

    const completeCall = query.mock.calls[0];
    expect(completeCall).toBeDefined();
    if (!completeCall) throw new Error('Expected complete SQL to run.');
    const [sql, values] = completeCall;
    expect(sql).toContain('private.complete_ai_tutor_turn_v2');
    expect(values).toEqual([
      userId,
      request.conversationId,
      request.turnId,
      leaseToken,
      payloadHash,
      JSON.stringify(response),
      30,
      20,
      50,
      123,
      'deepseek-v4-flash',
      'deepseek-v4-flash:high:disabled',
    ]);
  });

  it('marks provider failure and preserves only a normalized error code', async () => {
    const query = createQuery([
      {
        conversation_id: request.conversationId,
        idempotent_replay: false,
        state: 'failed',
        turn_id: request.turnId,
      },
    ]);

    await expect(
      failTutorTurn(
        {
          conversationId: request.conversationId,
          errorCode: 'provider_timeout',
          leaseToken,
          request,
          userId,
        },
        createExecutor(query),
      ),
    ).resolves.toBeUndefined();
    expect(query.mock.calls[0]?.[1]).toEqual([
      userId,
      request.conversationId,
      request.turnId,
      leaseToken,
      payloadHash,
      'provider_timeout',
    ]);
  });

  it.each([
    ['42501', 'AI tutor provider processing consent is required.', 403, 'FORBIDDEN'],
    ['P0001', 'Tutor hourly quota has been reached.', 429, 'RATE_LIMITED'],
    ['P0002', 'Tutor language pack is not available.', 409, 'INVALID_REQUEST'],
    ['22023', 'Tutor turn identity was reused with a different payload.', 409, 'INVALID_REQUEST'],
  ])('maps PostgreSQL %s to a safe API error', async (code, message, status, apiCode) => {
    const execute = async () => {
      throw Object.assign(new Error(message), { code });
    };

    await expect(
      beginTutorTurn(
        { consentPolicyKey: 'ai-tutor-provider-processing-v1', request, userId },
        execute,
      ),
    ).rejects.toMatchObject({
      code: apiCode,
      status,
    });
  });

  it('preserves unknown database failures for the generic route boundary', async () => {
    const infrastructureError = new Error('database password must remain internal');
    const execute = async () => {
      throw infrastructureError;
    };

    await expect(
      beginTutorTurn(
        { consentPolicyKey: 'ai-tutor-provider-processing-v1', request, userId },
        execute,
      ),
    ).rejects.toBe(infrastructureError);
  });
});
