import { createExpoSecureSessionStorage } from '../secure-session/expo-secure-session-storage';

import { syncNamespaceSchema } from '@ideogram/contracts';

import type { SyncNamespace } from '@ideogram/contracts';
import type { SyncQueueStorage } from '@ideogram/sync';

const queueKey = 'offline-sync-queue-v1';
const sessionNamespaceKey = 'offline-sync-session-namespace-v1';
const storageNamespace = 'ideogram-learning.offline-sync';

const createStorage = () => createExpoSecureSessionStorage(storageNamespace);

export const createExpoSecureSyncStorage = (): SyncQueueStorage => {
  const storage = createStorage();
  return {
    clear: () => storage.removeItem(queueKey),
    read: () => storage.getItem(queueKey),
    write: (value) => storage.setItem(queueKey, value),
  };
};

export const writeNativeOfflineSyncSessionNamespace = async (
  namespace: SyncNamespace,
): Promise<void> => {
  await createStorage().setItem(
    sessionNamespaceKey,
    JSON.stringify(syncNamespaceSchema.parse(namespace)),
  );
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
  await createStorage().removeItem(sessionNamespaceKey);
};
