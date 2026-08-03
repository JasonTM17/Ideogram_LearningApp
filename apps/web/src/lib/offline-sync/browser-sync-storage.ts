import type { SyncQueueStorage } from '@ideogram/sync';

import { withBrowserExclusiveLock } from '@/lib/browser-exclusive-lock';

const databaseName = 'ideogram-learning-offline-sync-v1';
const objectStoreName = 'snapshots';

interface StoredValue {
  key: string;
  value: string;
}

const openDatabase = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = window.indexedDB.open(databaseName, 1);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB is unavailable.'));
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(objectStoreName)) {
        request.result.createObjectStore(objectStoreName, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });

const readValue = async (key: string): Promise<string | null> => {
  const database = await openDatabase();
  try {
    return await new Promise<string | null>((resolve, reject) => {
      const request = database
        .transaction(objectStoreName, 'readonly')
        .objectStore(objectStoreName)
        .get(key);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB read failed.'));
      request.onsuccess = () => {
        const value = request.result as StoredValue | undefined;
        resolve(value?.value ?? null);
      };
    });
  } finally {
    database.close();
  }
};

const writeValue = async (key: string, value: string): Promise<void> => {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(objectStoreName, 'readwrite');
      transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB write failed.'));
      transaction.oncomplete = () => resolve();
      transaction.objectStore(objectStoreName).put({ key, value } satisfies StoredValue);
    });
  } finally {
    database.close();
  }
};

const removeValue = async (key: string): Promise<void> => {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(objectStoreName, 'readwrite');
      transaction.onerror = () =>
        reject(transaction.error ?? new Error('IndexedDB delete failed.'));
      transaction.oncomplete = () => resolve();
      transaction.objectStore(objectStoreName).delete(key);
    });
  } finally {
    database.close();
  }
};

export const clearBrowserSyncQueueStorage = async (): Promise<void> => {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(objectStoreName, 'readwrite');
      transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB clear failed.'));
      transaction.oncomplete = () => resolve();
      transaction.objectStore(objectStoreName).clear();
    });
  } finally {
    database.close();
  }
};

export const createBrowserSyncQueueStorage = (userId: string): SyncQueueStorage => {
  const key = `user:${userId}`;
  const lockName = `ideogram-learning-offline-sync:${userId}`;
  return {
    clear: () => removeValue(key),
    exclusive: <T>(operation: () => Promise<T>): Promise<T> =>
      withBrowserExclusiveLock(lockName, operation),
    read: () => readValue(key),
    shared: true,
    write: (value) => writeValue(key, value),
  };
};
