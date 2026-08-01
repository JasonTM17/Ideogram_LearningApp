import { Pool } from 'pg';

import { readLearningDatabaseConfiguration } from './learning-database-environment';

import type { PoolClient } from 'pg';

export interface LearningExecutorPool {
  connect: () => Promise<PoolClient>;
}

export class LearningExecutorUnavailableError extends Error {
  constructor(cause?: unknown) {
    super('The learning database executor is unavailable.', { cause });
    this.name = 'LearningExecutorUnavailableError';
  }
}

const globalLearningDatabase = globalThis as typeof globalThis & {
  __ideogramLearningExecutorPool?: Pool;
};

const readPostgresErrorCode = (error: unknown): string | undefined => {
  if (!error || typeof error !== 'object' || !('code' in error)) {
    return undefined;
  }

  return typeof error.code === 'string' ? error.code : undefined;
};

const createLearningExecutorPool = (): Pool => {
  const { connectionString, maxConnections } = readLearningDatabaseConfiguration();
  const pool = new Pool({
    application_name: 'ideogram-learning-web',
    connectionString,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 10_000,
    max: maxConnections,
    maxLifetimeSeconds: 300,
  });

  pool.on('error', (error) => {
    console.error('Learning database idle connection failed.', {
      code: readPostgresErrorCode(error) ?? 'UNKNOWN',
    });
  });

  return pool;
};

export const getLearningExecutorPool = (): Pool => {
  globalLearningDatabase.__ideogramLearningExecutorPool ??= createLearningExecutorPool();
  return globalLearningDatabase.__ideogramLearningExecutorPool;
};

const configureTransaction = async (client: PoolClient): Promise<void> => {
  await client.query('BEGIN');
  await client.query('SET LOCAL ROLE app_learning_api_executor');
  await client.query("SET LOCAL statement_timeout = '5s'");
  await client.query("SET LOCAL lock_timeout = '2s'");
};

export const withLearningExecutorTransaction = async <Result>(
  operation: (client: PoolClient) => Promise<Result>,
  pool: LearningExecutorPool = getLearningExecutorPool(),
): Promise<Result> => {
  let client: PoolClient;
  try {
    client = await pool.connect();
  } catch (error) {
    throw new LearningExecutorUnavailableError(error);
  }

  let transactionConfigured = false;
  let operationCompleted = false;
  let destroyClient = false;

  try {
    await configureTransaction(client);
    transactionConfigured = true;

    const result = await operation(client);
    operationCompleted = true;
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      destroyClient = true;
    }

    if (!transactionConfigured || operationCompleted) {
      throw new LearningExecutorUnavailableError(error);
    }

    throw error;
  } finally {
    client.release(destroyClient);
  }
};
