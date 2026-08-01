import { createExpoInstallationSentinel } from '../secure-session/expo-installation-sentinel';
import { createExpoSecureSessionStorage } from '../secure-session/expo-secure-session-storage';
import { InstallationBoundSessionStorage } from '../secure-session/installation-bound-session-storage';
import { createNativeAuthTransactionStorageKey } from '../secure-session/native-auth-transaction-key';
import { readNativeSupabaseConfiguration } from './native-supabase-environment';
import { SecureNativeEmailOtpTransactionStore } from './native-email-otp-transaction-store';

import type { NativeEmailOtpTransactionStore } from './native-email-otp-transaction-store';

export const createNativeEmailOtpTransactionStore = (): NativeEmailOtpTransactionStore => {
  const configuration = readNativeSupabaseConfiguration();
  const storage = new InstallationBoundSessionStorage(
    createExpoSecureSessionStorage(),
    configuration.storageKey,
    createExpoInstallationSentinel(),
  );

  return new SecureNativeEmailOtpTransactionStore(
    storage,
    createNativeAuthTransactionStorageKey(configuration.storageKey),
  );
};
