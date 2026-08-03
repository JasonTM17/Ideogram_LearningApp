import { describe, expect, it } from 'vitest';

import { DurableSyncQueue, type SyncQueueStorage } from '../src';

const namespace = { sessionEpoch: 3, userId: '12000000-0000-4000-8000-000000000001' };
const input = {
  idempotencyKey: '62000000-0000-4000-8000-000000000001',
  kind: 'review' as const,
  operationId: '62000000-0000-4000-8000-000000000002',
  payload: { itemId: '82000000-0000-4000-8000-000000000001', grade: 'good' },
};

const createStorage = (
  initial: string | null = null,
): SyncQueueStorage & { value: string | null } => {
  const storage = {
    value: initial,
    read: async () => storage.value,
    write: async (value: string) => {
      storage.value = value;
    },
    clear: async () => {
      storage.value = null;
    },
  };
  return storage;
};

describe('durable sync queue', () => {
  it('serializes fresh shared-storage writes from separate runtime contexts', async () => {
    const storage = createStorage() as SyncQueueStorage & { value: string | null };
    let tail = Promise.resolve();
    storage.shared = true;
    storage.exclusive = async <T>(operation: () => Promise<T>): Promise<T> => {
      const previous = tail;
      let release!: () => void;
      tail = new Promise<void>((resolve) => {
        release = resolve;
      });
      await previous;
      try {
        return await operation();
      } finally {
        release();
      }
    };
    const firstQueue = new DurableSyncQueue(storage, namespace);
    const secondQueue = new DurableSyncQueue(storage, namespace);

    await Promise.all([
      firstQueue.enqueue(input),
      secondQueue.enqueue({
        ...input,
        idempotencyKey: '62000000-0000-4000-8000-000000000003',
        operationId: '62000000-0000-4000-8000-000000000004',
      }),
    ]);

    await expect(firstQueue.getPending()).resolves.toHaveLength(2);
  });

  it('deduplicates enqueue and removes only receipt-confirmed mutations', async () => {
    const storage = createStorage();
    const queue = new DurableSyncQueue(storage, namespace);
    await queue.enqueue(input);
    await queue.enqueue(input);

    expect(await queue.getPending()).toHaveLength(1);
    await expect(queue.drain(async () => ({ kind: 'retry', reason: 'offline' }))).resolves.toEqual({
      blocked: 0,
      completed: 0,
      retried: 1,
    });
    await expect(queue.drain(async () => ({ kind: 'completed' }))).resolves.toEqual({
      blocked: 0,
      completed: 1,
      retried: 0,
    });
    await expect(queue.getPending()).resolves.toEqual([]);
  });

  it('clears a queue from another session namespace instead of replaying it', async () => {
    const firstStorage = createStorage();
    const firstQueue = new DurableSyncQueue(firstStorage, namespace);
    await firstQueue.enqueue(input);
    const secondQueue = new DurableSyncQueue(firstStorage, {
      sessionEpoch: 4,
      userId: '12000000-0000-4000-8000-000000000002',
    });

    await expect(secondQueue.getPending()).resolves.toEqual([]);
    expect(firstStorage.value).toBeNull();
  });

  it('blocks a permanent conflict and preserves the item for user action', async () => {
    const queue = new DurableSyncQueue(createStorage(), namespace);
    await queue.enqueue(input);

    await expect(
      queue.drain(async () => ({ kind: 'blocked', reason: 'conflict' })),
    ).resolves.toEqual({
      blocked: 1,
      completed: 0,
      retried: 0,
    });
    await expect(queue.getPending()).resolves.toMatchObject([{ status: 'blocked' }]);
    await expect(queue.retryBlocked()).resolves.toBe(1);
    await expect(queue.getPending()).resolves.toMatchObject([{ retryCount: 0, status: 'pending' }]);
  });

  it('discards only blocked mutations after an explicit user action', async () => {
    const queue = new DurableSyncQueue(createStorage(), namespace);
    await queue.enqueue(input);
    await queue.enqueue({
      ...input,
      idempotencyKey: '62000000-0000-4000-8000-000000000003',
      operationId: '62000000-0000-4000-8000-000000000004',
    });
    await queue.drain(async () => ({ kind: 'blocked', reason: 'conflict' }));

    await expect(queue.discardBlocked()).resolves.toBe(1);
    await expect(queue.getPending()).resolves.toMatchObject([
      { operationId: '62000000-0000-4000-8000-000000000004', status: 'pending' },
    ]);
  });

  it('keeps the remaining ordered mutations when a background drain reaches its cap', async () => {
    const queue = new DurableSyncQueue(createStorage(), namespace);
    await queue.enqueue(input);
    await queue.enqueue({
      ...input,
      idempotencyKey: '62000000-0000-4000-8000-000000000003',
      operationId: '62000000-0000-4000-8000-000000000004',
    });

    await expect(
      queue.drain(async () => ({ kind: 'completed' }), { maxMutations: 1 }),
    ).resolves.toEqual({
      blocked: 0,
      completed: 1,
      retried: 0,
    });
    await expect(queue.getPending()).resolves.toMatchObject([
      { operationId: '62000000-0000-4000-8000-000000000004' },
    ]);
  });

  it('measures the storage budget in UTF-8 bytes', async () => {
    const queue = new DurableSyncQueue(createStorage(), namespace);

    await expect(
      queue.enqueue({ ...input, payload: { text: '語'.repeat(90_000) } }),
    ).rejects.toThrow('Hàng đợi ngoại tuyến đã đầy');
  });
});
