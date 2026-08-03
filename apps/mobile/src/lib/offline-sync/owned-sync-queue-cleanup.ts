import { syncQueueSnapshotSchema } from '@ideogram/contracts';

import type { SyncNamespace } from '@ideogram/contracts';
import type { SyncQueueStorage } from '@ideogram/sync';

export const clearSyncQueueIfOwnedBy = async (
  storage: SyncQueueStorage,
  expectedNamespace: SyncNamespace,
): Promise<boolean> => {
  const compareAndClear = async () => {
    const raw = await storage.read();
    if (!raw) return false;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return false;
    }
    const snapshot = syncQueueSnapshotSchema.safeParse(parsed);
    if (
      !snapshot.success ||
      snapshot.data.namespace.userId !== expectedNamespace.userId ||
      snapshot.data.namespace.sessionEpoch !== expectedNamespace.sessionEpoch
    ) {
      return false;
    }
    await storage.clear();
    return true;
  };

  return storage.exclusive ? storage.exclusive(compareAndClear) : compareAndClear();
};
