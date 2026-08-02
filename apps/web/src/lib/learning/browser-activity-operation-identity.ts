import {
  ActivityOperationIdentityError,
  ActivityOperationIdentityStore,
} from '@ideogram/api-client';

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

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

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
  try {
    if (typeof globalThis.crypto?.randomUUID !== 'function') {
      throw new Error('Browser UUID generation is unavailable.');
    }

    const uuid = globalThis.crypto.randomUUID();
    if (!uuidPattern.test(uuid)) {
      throw new Error('Browser UUID generation returned an invalid UUID.');
    }

    return uuid;
  } catch (error) {
    throw new ActivityOperationIdentityError(
      'device_id_failure',
      'Browser UUID generation is unavailable.',
      error,
    );
  }
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
