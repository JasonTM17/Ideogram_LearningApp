import { describe, expect, it, vi } from 'vitest';

import {
  LearningExecutorUnavailableError,
  withLearningExecutorTransaction,
} from './learning-executor-pool';

import type { PoolClient } from 'pg';

const createClient = (queryImplementation?: (queryText: string) => Promise<unknown>) => {
  const query = vi.fn(queryImplementation ?? (async () => ({ rowCount: 0, rows: [] })));
  const release = vi.fn();

  return {
    client: { query, release } as unknown as PoolClient,
    query,
    release,
  };
};

describe('learning executor transaction', () => {
  it('configures the least-privilege role on one client and commits the operation', async () => {
    const { client, query, release } = createClient();
    const pool = { connect: async () => client };

    await expect(
      withLearningExecutorTransaction(async (transactionClient) => {
        expect(transactionClient).toBe(client);
        await transactionClient.query('select 1');
        return 'receipt';
      }, pool),
    ).resolves.toBe('receipt');

    expect(query.mock.calls.map(([queryText]) => queryText)).toEqual([
      'BEGIN',
      'SET LOCAL ROLE app_learning_api_executor',
      "SET LOCAL statement_timeout = '5s'",
      "SET LOCAL lock_timeout = '2s'",
      'select 1',
      'COMMIT',
    ]);
    expect(release).toHaveBeenCalledWith(false);
  });

  it('rolls back and preserves a domain error from the operation', async () => {
    const domainError = Object.assign(new Error('review conflict'), { code: '22023' });
    const { client, query, release } = createClient();

    await expect(
      withLearningExecutorTransaction(
        async () => {
          throw domainError;
        },
        { connect: async () => client },
      ),
    ).rejects.toBe(domainError);

    expect(query.mock.calls.at(-1)?.[0]).toBe('ROLLBACK');
    expect(release).toHaveBeenCalledWith(false);
  });

  it('normalizes connection and transaction setup failures as unavailable', async () => {
    await expect(
      withLearningExecutorTransaction(async () => 'unused', {
        connect: async () => {
          throw new Error('connection secret must stay internal');
        },
      }),
    ).rejects.toBeInstanceOf(LearningExecutorUnavailableError);

    const { client, release } = createClient(async (queryText) => {
      if (queryText.startsWith('SET LOCAL ROLE')) {
        throw new Error('role membership missing');
      }
      return { rowCount: 0, rows: [] };
    });

    await expect(
      withLearningExecutorTransaction(async () => 'unused', { connect: async () => client }),
    ).rejects.toBeInstanceOf(LearningExecutorUnavailableError);
    expect(release).toHaveBeenCalledWith(false);
  });

  it('destroys a client that cannot roll back', async () => {
    const domainError = new Error('operation failed');
    const { client, release } = createClient(async (queryText) => {
      if (queryText === 'ROLLBACK') {
        throw new Error('connection lost');
      }
      return { rowCount: 0, rows: [] };
    });

    await expect(
      withLearningExecutorTransaction(
        async () => {
          throw domainError;
        },
        { connect: async () => client },
      ),
    ).rejects.toBe(domainError);
    expect(release).toHaveBeenCalledWith(true);
  });
});
