import { ActivityOperationIdentityStore } from '@ideogram/api-client';

import type { AsyncKeyValueStorage } from '@ideogram/api-client';

export interface BrowserActivityOperationStorage {
  getItem(key: string): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
}

export interface BrowserActivityOperationIdentityStoreOptions {
  readonly createDeviceId?: () => string;
  readonly storage?: BrowserActivityOperationStorage;
}

const getBrowserStorage = (): BrowserActivityOperationStorage => {
  if (typeof window === 'undefined') {
    throw new Error('Browser activity storage is unavailable during server rendering.');
  }

  return window.localStorage;
};

const createStorageAdapter = (
  storage: BrowserActivityOperationStorage | undefined,
): AsyncKeyValueStorage => {
  const resolveStorage = (): BrowserActivityOperationStorage => storage ?? getBrowserStorage();

  return {
    getItem: async (key) => resolveStorage().getItem(key),
    removeItem: async (key) => {
      resolveStorage().removeItem(key);
    },
    setItem: async (key, value) => {
      resolveStorage().setItem(key, value);
    },
  };
};

export const createBrowserUuid = (): string => {
  if (typeof globalThis.crypto?.randomUUID !== 'function') {
    throw new Error('Browser UUID generation is unavailable.');
  }

  return globalThis.crypto.randomUUID();
};

/**
 * Creates a browser-only facade over the shared identity store. Storage is
 * intentionally resolved during `reserve()` so SSR and storage-restricted
 * browsers fail closed through the shared `storage_failure` error path.
 */
export const createBrowserActivityOperationIdentityStore = (
  options: BrowserActivityOperationIdentityStoreOptions = {},
): ActivityOperationIdentityStore =>
  new ActivityOperationIdentityStore({
    createDeviceId: options.createDeviceId ?? createBrowserUuid,
    storage: createStorageAdapter(options.storage),
  });
