import { createExpoSecureSessionStorage } from '../secure-session/expo-secure-session-storage';
import { clearSyncQueueIfOwnedBy } from './owned-sync-queue-cleanup';
import {
  invalidateNativeOfflineSyncRequests,
  updateNativeOfflineSyncRequestNamespace,
} from './native-offline-sync-session-signal';

import { syncNamespaceSchema, syncQueueSnapshotSchema } from '@ideogram/contracts';

import type { SyncNamespace } from '@ideogram/contracts';
import type { SyncQueueStorage } from '@ideogram/sync';

const sessionNamespaceKey = 'offline-sync-session-namespace-v1';
const legacyQueueKey = 'offline-sync-queue-v1';
const storageNamespace = 'ideogram-learning.offline-sync';
const sharedSyncStorageLocks = new Map<string, Promise<void>>();
const legacyMigrationPromises = new Map<string, Promise<void>>();

const createStorage = () => createExpoSecureSessionStorage(storageNamespace);

export const createNativeOfflineSyncQueueKey = (namespace: SyncNamespace) =>
  `offline-sync-queue-v2:${namespace.userId}:${namespace.sessionEpoch}`;

const runSyncStorageExclusive = <T>(key: string, operation: () => Promise<T>): Promise<T> => {
  const previous = sharedSyncStorageLocks.get(key) ?? Promise.resolve();
  const result = previous.catch(() => undefined).then(operation);
  const tail = result.then(
    () => undefined,
    () => undefined,
  );
  sharedSyncStorageLocks.set(key, tail);
  return result.finally(() => {
    if (sharedSyncStorageLocks.get(key) === tail) sharedSyncStorageLocks.delete(key);
  });
};

export const createExpoSecureSyncStorage = (namespace: SyncNamespace): SyncQueueStorage => {
  const validNamespace = syncNamespaceSchema.parse(namespace);
  const storage = createStorage();
  const queueKey = createNativeOfflineSyncQueueKey(validNamespace);
  const migrateLegacyQueue = () => {
    const existing = legacyMigrationPromises.get(queueKey);
    if (existing) return existing;

    const migration = runSyncStorageExclusive(legacyQueueKey, async () => {
      const legacyRaw = await storage.getItem(legacyQueueKey);
      if (!legacyRaw) return;

      let legacySnapshot: unknown;
      try {
        legacySnapshot = JSON.parse(legacyRaw);
      } catch {
        await storage.removeItem(legacyQueueKey);
        return;
      }
      const parsed = syncQueueSnapshotSchema.safeParse(legacySnapshot);
      const belongsToNamespace =
        parsed.success &&
        parsed.data.namespace.userId === validNamespace.userId &&
        parsed.data.namespace.sessionEpoch === validNamespace.sessionEpoch;
      if (belongsToNamespace) {
        const currentRaw = await storage.getItem(queueKey);
        let currentSnapshot: unknown;
        try {
          currentSnapshot = currentRaw ? JSON.parse(currentRaw) : null;
        } catch {
          currentSnapshot = null;
        }
        const current = syncQueueSnapshotSchema.safeParse(currentSnapshot);
        const currentIsAuthoritative =
          current.success &&
          current.data.namespace.userId === validNamespace.userId &&
          current.data.namespace.sessionEpoch === validNamespace.sessionEpoch;
        if (!currentIsAuthoritative) await storage.setItem(queueKey, legacyRaw);
      }
      await storage.removeItem(legacyQueueKey);
    });
    legacyMigrationPromises.set(queueKey, migration);
    return migration.catch((error: unknown) => {
      legacyMigrationPromises.delete(queueKey);
      throw error;
    });
  };

  return {
    clear: async () => {
      await migrateLegacyQueue();
      await storage.removeItem(queueKey);
    },
    exclusive: async (operation) => {
      await migrateLegacyQueue();
      return runSyncStorageExclusive(queueKey, operation);
    },
    read: async () => {
      await migrateLegacyQueue();
      return storage.getItem(queueKey);
    },
    shared: true,
    write: async (value) => {
      await migrateLegacyQueue();
      await storage.setItem(queueKey, value);
    },
  };
};

export const clearNativeOfflineSyncQueueIfOwnedBy = (namespace: SyncNamespace) =>
  clearSyncQueueIfOwnedBy(createExpoSecureSyncStorage(namespace), namespace);

export const writeNativeOfflineSyncSessionNamespace = async (
  namespace: SyncNamespace,
): Promise<void> => {
  const validNamespace = syncNamespaceSchema.parse(namespace);
  await createStorage().setItem(sessionNamespaceKey, JSON.stringify(validNamespace));
  updateNativeOfflineSyncRequestNamespace(validNamespace);
};

export const readNativeOfflineSyncSessionNamespace = async (): Promise<SyncNamespace | null> => {
  const raw = await createStorage().getItem(sessionNamespaceKey);
  if (!raw) return null;
  try {
    return syncNamespaceSchema.parse(JSON.parse(raw));
  } catch {
    await createStorage().removeItem(sessionNamespaceKey);
    return null;
  }
};

export const clearNativeOfflineSyncSessionNamespace = async (): Promise<void> => {
  invalidateNativeOfflineSyncRequests();
  await createStorage().removeItem(sessionNamespaceKey);
};
