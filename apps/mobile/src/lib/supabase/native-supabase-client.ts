import 'react-native-url-polyfill/auto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import {
  createExpoInstallationSentinel,
  createExpoSecureSessionStorage,
  InstallationBoundSessionStorage,
} from '../secure-session';
import { createNativeSupabaseAuthOptions } from './native-supabase-auth-options';
import {
  NativeSupabaseConfigurationError,
  readNativeSupabaseConfiguration,
} from './native-supabase-environment';

let nativeSupabaseClient: SupabaseClient | undefined;

export const getNativeSupabaseClient = (): SupabaseClient => {
  if (Platform.OS === 'web') {
    throw new NativeSupabaseConfigurationError(
      'The native Supabase client requires iOS or Android secure storage.',
    );
  }

  if (nativeSupabaseClient) {
    return nativeSupabaseClient;
  }

  const configuration = readNativeSupabaseConfiguration();
  const secureStorage = createExpoSecureSessionStorage();
  const installationBoundStorage = new InstallationBoundSessionStorage(
    secureStorage,
    configuration.storageKey,
    createExpoInstallationSentinel(),
  );

  nativeSupabaseClient = createClient(configuration.url, configuration.publishableKey, {
    auth: createNativeSupabaseAuthOptions(configuration, installationBoundStorage),
  });

  return nativeSupabaseClient;
};
