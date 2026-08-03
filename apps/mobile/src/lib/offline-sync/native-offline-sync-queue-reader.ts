import { syncQueueSnapshotSchema } from '@ideogram/contracts';
import { DurableSyncQueue } from '@ideogram/sync';

import type { SyncNamespace } from '@ideogram/contracts';
import type { SyncQueueStorage } from '@ideogram/sync';

export const readNativeOfflineSyncQueue = async (
  storage: SyncQueueStorage,
  expectedNamespace: SyncNamespace,
) => {
  const readAndValidate = async () => {
    const raw = await storage.read();
    if (!raw) return null;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      await storage.clear();
      return null;
    }
    const snapshot = syncQueueSnapshotSchema.safeParse(parsed);
    if (
      !snapshot.success ||
      snapshot.data.namespace.userId !== expectedNamespace.userId ||
      snapshot.data.namespace.sessionEpoch !== expectedNamespace.sessionEpoch
    ) {
      await storage.clear();
      return null;
    }
    if (snapshot.data.mutations.length === 0) return null;
    return {
      namespace: expectedNamespace,
      queue: new DurableSyncQueue(storage, expectedNamespace),
    };
  };

  return storage.exclusive ? storage.exclusive(readAndValidate) : readAndValidate();
};
