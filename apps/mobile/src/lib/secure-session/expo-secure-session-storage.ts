import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import { ChunkedSecureSessionStorage } from './chunked-secure-session-storage';
import { SecureSessionStorageError, type SecureStorePort } from './secure-session-storage-types';

const secureStoreOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  keychainService: 'ideogram-learning.session',
  requireAuthentication: false,
};

const createAvailabilityGuard = () => {
  let availability: Promise<boolean> | undefined;

  return async () => {
    availability ??= SecureStore.isAvailableAsync();

    if (!(await availability)) {
      throw new SecureSessionStorageError(
        'unavailable',
        'Secure session storage is unavailable on this platform.',
      );
    }
  };
};

export const createExpoSecureSessionStorage = (): ChunkedSecureSessionStorage => {
  const assertAvailable = createAvailabilityGuard();
  const secureStorePort: SecureStorePort = {
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

  return new ChunkedSecureSessionStorage(secureStorePort, {
    sha256: (value) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value),
  });
};
