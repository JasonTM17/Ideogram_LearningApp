import { describe, expect, it } from 'vitest';

import { syncMutationSchema, syncQueueSnapshotSchema } from './sync-contract';

const mutation = {
  createdAt: '2026-08-03T00:00:00.000Z',
  idempotencyKey: '62000000-0000-4000-8000-000000000001',
  kind: 'review' as const,
  namespace: { sessionEpoch: 1, userId: '12000000-0000-4000-8000-000000000001' },
  operationId: '62000000-0000-4000-8000-000000000002',
  payload: { itemId: '82000000-0000-4000-8000-000000000001', grade: 'good' },
  retryCount: 0,
  status: 'pending' as const,
};

describe('sync contracts', () => {
  it('accepts a bounded namespaced mutation snapshot', () => {
    expect(
      syncQueueSnapshotSchema.parse({ namespace: mutation.namespace, mutations: [mutation] })
        .mutations,
    ).toHaveLength(1);
  });

  it('rejects a mutation with an unbounded retry count or unknown fields', () => {
    expect(syncMutationSchema.safeParse({ ...mutation, retryCount: 21 }).success).toBe(false);
    expect(syncMutationSchema.safeParse({ ...mutation, token: 'secret' }).success).toBe(false);
  });

  it('accepts a queued final placement submission', () => {
    expect(
      syncMutationSchema.parse({
        ...mutation,
        kind: 'placement-submit',
        payload: { placementSessionId: '72000000-0000-4000-8000-000000000001' },
      }).kind,
    ).toBe('placement-submit');
  });
});
