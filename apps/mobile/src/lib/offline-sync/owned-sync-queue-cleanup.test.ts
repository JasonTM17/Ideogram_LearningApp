import { describe, expect, it, vi } from 'vitest';

import { clearSyncQueueIfOwnedBy } from './owned-sync-queue-cleanup';

import type { SyncNamespace, SyncQueueSnapshot } from '@ideogram/contracts';
import type { SyncQueueStorage } from '@ideogram/sync';

const accountA: SyncNamespace = {
  sessionEpoch: 1,
  userId: '123e4567-e89b-42d3-a456-426614174000',
};
const accountB: SyncNamespace = {
  sessionEpoch: 2,
  userId: '123e4567-e89b-42d3-a456-426614174001',
};
const snapshot = (namespace: SyncNamespace): SyncQueueSnapshot => ({
  mutations: [],
  namespace,
});

const createStorage = (initial: string | null) => {
  let value = initial;
  const storage: SyncQueueStorage = {
    clear: vi.fn(async () => {
      value = null;
    }),
    exclusive: async (operation) => operation(),
    read: vi.fn(async () => value),
    write: vi.fn(async (next) => {
      value = next;
    }),
  };
  return { readValue: () => value, storage };
};

describe('owned native sync queue cleanup', () => {
  it('does not let a stale account A task clear a newer account B queue', async () => {
    const current = JSON.stringify(snapshot(accountB));
    const { readValue, storage } = createStorage(current);

    await expect(clearSyncQueueIfOwnedBy(storage, accountA)).resolves.toBe(false);
    expect(readValue()).toBe(current);
    expect(storage.clear).not.toHaveBeenCalled();
  });

  it('clears only the queue that still belongs to the expected namespace', async () => {
    const { readValue, storage } = createStorage(JSON.stringify(snapshot(accountA)));

    await expect(clearSyncQueueIfOwnedBy(storage, accountA)).resolves.toBe(true);
    expect(readValue()).toBeNull();
    expect(storage.clear).toHaveBeenCalledOnce();
  });

  it('does not delete an invalid value whose ownership cannot be proven', async () => {
    const { readValue, storage } = createStorage('{invalid');

    await expect(clearSyncQueueIfOwnedBy(storage, accountA)).resolves.toBe(false);
    expect(readValue()).toBe('{invalid');
    expect(storage.clear).not.toHaveBeenCalled();
  });
});
