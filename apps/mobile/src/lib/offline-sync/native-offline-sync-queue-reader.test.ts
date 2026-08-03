import { describe, expect, it, vi } from 'vitest';

import { readNativeOfflineSyncQueue } from './native-offline-sync-queue-reader';

import type { SyncNamespace } from '@ideogram/contracts';
import type { SyncQueueStorage } from '@ideogram/sync';

const expectedNamespace: SyncNamespace = {
  sessionEpoch: 4,
  userId: '123e4567-e89b-42d3-a456-426614174000',
};

const createStorage = (value: string | null) => {
  const state = { value };
  const storage: SyncQueueStorage = {
    clear: vi.fn(async () => {
      state.value = null;
    }),
    exclusive: vi.fn(async (operation) => operation()),
    read: vi.fn(async () => state.value),
    shared: true,
    write: vi.fn(async (next) => {
      state.value = next;
    }),
  };
  return storage;
};

describe('native offline sync queue reader', () => {
  it('atomically clears a snapshot stored under the wrong namespace key', async () => {
    const storage = createStorage(
      JSON.stringify({
        mutations: [],
        namespace: { ...expectedNamespace, sessionEpoch: 5 },
      }),
    );

    await expect(readNativeOfflineSyncQueue(storage, expectedNamespace)).resolves.toBeNull();
    expect(storage.exclusive).toHaveBeenCalledOnce();
    expect(storage.clear).toHaveBeenCalledOnce();
  });

  it('atomically clears malformed queue bytes', async () => {
    const storage = createStorage('{');

    await expect(readNativeOfflineSyncQueue(storage, expectedNamespace)).resolves.toBeNull();
    expect(storage.clear).toHaveBeenCalledOnce();
  });
});
