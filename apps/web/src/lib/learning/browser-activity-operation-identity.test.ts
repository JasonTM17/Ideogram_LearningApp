import { describe, expect, it } from 'vitest';

import { ActivityOperationIdentityError } from '@ideogram/api-client';

import { createBrowserActivityOperationIdentityStore } from './browser-activity-operation-identity';

const deviceId = '123e4567-e89b-42d3-a456-426614174001';

const createStorage = () => {
  const values = new Map<string, string>();
  return {
    storage: {
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => {
        values.delete(key);
      },
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
    },
    values,
  };
};

describe('createBrowserActivityOperationIdentityStore', () => {
  it('retains a browser device identity and increments its sequence', async () => {
    const { storage } = createStorage();
    const first = createBrowserActivityOperationIdentityStore({
      createDeviceId: () => deviceId,
      storage,
    });
    const second = createBrowserActivityOperationIdentityStore({
      createDeviceId: () => {
        throw new Error('must reuse the stored device identity');
      },
      storage,
    });

    await expect(first.reserve()).resolves.toEqual({ deviceId, deviceSequence: 1 });
    await expect(second.reserve()).resolves.toEqual({ deviceId, deviceSequence: 2 });
  });

  it('fails closed when browser storage is unavailable', async () => {
    const storage = {
      getItem: () => {
        throw new Error('storage denied');
      },
      removeItem: () => undefined,
      setItem: () => undefined,
    };
    const store = createBrowserActivityOperationIdentityStore({
      createDeviceId: () => deviceId,
      storage,
    });

    const error = await store.reserve().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ActivityOperationIdentityError);
    expect((error as ActivityOperationIdentityError).code).toBe('storage_failure');
  });
});
