import { describe, expect, it } from 'vitest';

import {
  ActivityOperationIdentityError,
  ActivityOperationIdentityStore,
  activityOperationIdentityStorageKey,
} from './activity-operation-identity';

import type { AsyncKeyValueStorage } from './activity-operation-identity';

const deviceId = '123e4567-e89b-42d3-a456-426614174001';
let storageKeyCounter = 0;

const createStorage = () => {
  const values = new Map<string, string>();
  const storage: AsyncKeyValueStorage = {
    getItem: async (key) => values.get(key) ?? null,
    removeItem: async (key) => {
      values.delete(key);
    },
    setItem: async (key, value) => {
      values.set(key, value);
    },
  };
  return { storage, values };
};

const createStore = (
  storage: AsyncKeyValueStorage,
  createDeviceId: () => string = () => deviceId,
  storageKey = `test-${storageKeyCounter++}`,
) => new ActivityOperationIdentityStore({ createDeviceId, storage, storageKey });

const readError = async (operation: Promise<unknown>): Promise<ActivityOperationIdentityError> => {
  const error = await operation.catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(ActivityOperationIdentityError);
  return error as ActivityOperationIdentityError;
};

describe('activity operation identity store', () => {
  it('rejects invalid storage keys', () => {
    expect(
      () =>
        new ActivityOperationIdentityStore({
          createDeviceId: () => deviceId,
          storage: createStorage().storage,
          storageKey: 'invalid key',
        }),
    ).toThrowError(ActivityOperationIdentityError);
  });

  it('creates one installation identity and reserves the first sequence', async () => {
    const { storage, values } = createStorage();
    const store = createStore(storage, () => deviceId, activityOperationIdentityStorageKey);

    await expect(store.reserve()).resolves.toEqual({ deviceId, deviceSequence: 1 });
    expect(JSON.parse(values.get(activityOperationIdentityStorageKey) ?? '')).toEqual({
      deviceId,
      nextDeviceSequence: 2,
      version: 1,
    });
  });

  it('continues the same device sequence after a store is recreated', async () => {
    const { storage } = createStorage();
    const first = createStore(storage, () => deviceId, 'restart-test');
    await first.reserve();

    const second = createStore(
      storage,
      () => {
        throw new Error('must not create a second device');
      },
      'restart-test',
    );

    await expect(second.reserve()).resolves.toEqual({ deviceId, deviceSequence: 2 });
  });

  it('clears a retained identity before a fresh installation stream starts', async () => {
    const { storage, values } = createStorage();
    const storageKey = 'reinstall-test';
    values.set(storageKey, JSON.stringify({ deviceId, nextDeviceSequence: 4, version: 1 }));
    let installationMarkerExists = false;
    const newDeviceId = '123e4567-e89b-42d3-a456-426614174002';
    const ensureInstallation = async () => {
      if (installationMarkerExists) {
        return;
      }

      await storage.removeItem(storageKey);
      installationMarkerExists = true;
    };
    const installationStore = new ActivityOperationIdentityStore({
      createDeviceId: () => newDeviceId,
      ensureInstallation,
      storage,
      storageKey,
    });

    await expect(installationStore.reserve()).resolves.toEqual({
      deviceId: newDeviceId,
      deviceSequence: 1,
    });
    await expect(createStore(storage, () => newDeviceId, storageKey).reserve()).resolves.toEqual({
      deviceId: newDeviceId,
      deviceSequence: 2,
    });
  });

  it('serializes concurrent reservations across store instances', async () => {
    const { storage } = createStorage();
    const first = createStore(storage, () => deviceId, 'concurrent-test');
    const second = createStore(storage, () => deviceId, 'concurrent-test');

    const identities = await Promise.all(
      Array.from({ length: 20 }, (_, index) => (index % 2 === 0 ? first : second).reserve()),
    );

    expect(identities.map((identity) => identity.deviceSequence).sort((a, b) => a - b)).toEqual(
      Array.from({ length: 20 }, (_, index) => index + 1),
    );
    expect(new Set(identities.map((identity) => identity.deviceId))).toEqual(new Set([deviceId]));
  });

  it('fails closed on corrupt persisted state', async () => {
    const { storage, values } = createStorage();
    values.set('corrupt-test', JSON.stringify({ deviceId, nextDeviceSequence: 0, version: 1 }));
    const store = createStore(
      storage,
      () => {
        throw new Error('must not reset corrupted state');
      },
      'corrupt-test',
    );

    const error = await readError(store.reserve());
    expect(error.code).toBe('corrupt_state');
  });

  it('does not return a sequence when persisting the reservation fails', async () => {
    const { storage } = createStorage();
    let failWrites = true;
    const failingStorage: AsyncKeyValueStorage = {
      getItem: storage.getItem,
      removeItem: storage.removeItem,
      setItem: async (key, value) => {
        if (failWrites) {
          throw new Error('write failed');
        }
        await storage.setItem(key, value);
      },
    };
    const store = createStore(failingStorage, () => deviceId, 'write-failure-test');

    const error = await readError(store.reserve());
    expect(error.code).toBe('storage_failure');
    failWrites = false;
    await expect(store.reserve()).resolves.toEqual({ deviceId, deviceSequence: 1 });
  });

  it('fails closed when installation preparation fails', async () => {
    const { storage, values } = createStorage();
    let failPreparation = true;
    const store = new ActivityOperationIdentityStore({
      createDeviceId: () => deviceId,
      ensureInstallation: async () => {
        if (failPreparation) {
          throw new Error('sentinel unavailable');
        }
      },
      storage,
      storageKey: 'installation-preparation-test',
    });

    const error = await readError(store.reserve());
    expect(error.code).toBe('storage_failure');
    expect(values.has('installation-preparation-test')).toBe(false);

    failPreparation = false;
    await expect(store.reserve()).resolves.toEqual({ deviceId, deviceSequence: 1 });
  });

  it('rejects an exhausted sequence without wrapping around', async () => {
    const { storage, values } = createStorage();
    values.set(
      'exhausted-test',
      JSON.stringify({ deviceId, nextDeviceSequence: Number.MAX_SAFE_INTEGER, version: 1 }),
    );
    const store = createStore(storage, () => deviceId, 'exhausted-test');

    const error = await readError(store.reserve());
    expect(error.code).toBe('sequence_exhausted');
  });
});
