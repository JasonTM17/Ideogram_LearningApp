import {
  ChunkedSecureSessionStorage,
  type ChunkedSecureSessionStorageOptions,
} from './chunked-secure-session-storage';

import type { SecureStorePort, Sha256Port } from './secure-session-storage-types';

type FailurePredicate = (key: string) => boolean;
type SetObserver = (key: string, value: string) => Promise<void>;

export class InMemorySecureStore implements SecureStorePort {
  beforeSet: SetObserver | undefined;
  failGet: FailurePredicate | undefined;
  failRemove: FailurePredicate | undefined;
  failSet: FailurePredicate | undefined;
  readonly values = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    if (this.failGet?.(key)) {
      throw new Error('read failed');
    }

    return this.values.get(key) ?? null;
  }

  async removeItem(key: string): Promise<void> {
    if (this.failRemove?.(key)) {
      throw new Error('remove failed');
    }

    this.values.delete(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    await this.beforeSet?.(key, value);

    if (this.failSet?.(key)) {
      throw new Error('write failed');
    }

    this.values.set(key, value);
  }
}

export const deterministicSha256: Sha256Port = {
  sha256: async (value) => {
    let hash = 2_166_136_261;

    for (const symbol of value) {
      hash = Math.imul(hash ^ (symbol.codePointAt(0) ?? 0), 16_777_619);
    }

    return (hash >>> 0).toString(16).padStart(8, '0').repeat(8);
  },
};

export const createStorageForSecureStore = (
  secureStore: InMemorySecureStore,
  options: ChunkedSecureSessionStorageOptions = {},
) =>
  new ChunkedSecureSessionStorage(secureStore, deterministicSha256, {
    chunkByteLimit: 64,
    maximumChunks: 8,
    ...options,
  });

export const createTestStorage = (options: ChunkedSecureSessionStorageOptions = {}) => {
  const secureStore = new InMemorySecureStore();
  const storage = createStorageForSecureStore(secureStore, options);

  return { secureStore, storage };
};

export const findStoredKey = (secureStore: InMemorySecureStore, suffix: string): string => {
  const key = [...secureStore.values.keys()].find((candidate) => candidate.endsWith(suffix));
  if (!key) {
    throw new Error(`Missing stored key with suffix: ${suffix}`);
  }

  return key;
};
