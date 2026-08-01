import * as Crypto from 'expo-crypto';
import { File, Paths } from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';

import {
  ActivityOperationIdentityStore,
  activityOperationIdentityStorageKey,
} from './activity-operation-identity';

import type { AsyncKeyValueStorage } from '../secure-session';

const secureStoreOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  keychainService: 'ideogram-learning.activity-operation',
  requireAuthentication: false,
};

const activityOperationInstallationSentinel = new File(
  Paths.document,
  '.ideogram-activity-operation-installation-v1',
);

const createAvailabilityGuard = () => {
  let availability: Promise<boolean> | undefined;

  return async () => {
    availability ??= SecureStore.isAvailableAsync();
    if (!(await availability)) {
      throw new Error('Secure activity operation identity storage is unavailable.');
    }
  };
};

export const createExpoActivityOperationIdentityStore = (): ActivityOperationIdentityStore => {
  const assertAvailable = createAvailabilityGuard();
  let installationCheck: Promise<void> | undefined;

  const ensureInstallation = async (): Promise<void> => {
    installationCheck ??= (async () => {
      await assertAvailable();
      if (activityOperationInstallationSentinel.exists) {
        return;
      }

      // iOS Keychain values can survive uninstall/reinstall. Delete the old
      // operation stream before creating the new installation marker.
      await SecureStore.deleteItemAsync(activityOperationIdentityStorageKey, secureStoreOptions);
      activityOperationInstallationSentinel.create({ intermediates: true, overwrite: true });
      activityOperationInstallationSentinel.write('v1');
    })().finally(() => {
      installationCheck = undefined;
    });

    await installationCheck;
  };

  const storage: AsyncKeyValueStorage = {
    getItem: async (key) => {
      await assertAvailable();
      return SecureStore.getItemAsync(key, secureStoreOptions);
    },
    removeItem: async (key) => {
      await assertAvailable();
      await SecureStore.deleteItemAsync(key, secureStoreOptions);
    },
    setItem: async (key, value) => {
      await assertAvailable();
      await SecureStore.setItemAsync(key, value, secureStoreOptions);
    },
  };

  return new ActivityOperationIdentityStore({
    createDeviceId: () => Crypto.randomUUID(),
    ensureInstallation,
    storage,
    storageKey: activityOperationIdentityStorageKey,
  });
};
