import type { AsyncKeyValueStorage } from '../secure-session';
import type { NativeSupabaseConfiguration } from './native-supabase-environment';

export const createNativeSupabaseAuthOptions = (
  configuration: Pick<NativeSupabaseConfiguration, 'storageKey'>,
  storage: AsyncKeyValueStorage,
) =>
  ({
    // AppState owns the refresh ticker. Keeping SDK auto-start disabled avoids
    // a cold-start race where background initialization restarts the ticker.
    autoRefreshToken: false,
    detectSessionInUrl: false,
    experimental: {
      appendPkceFlowIdToRedirects: true,
    },
    flowType: 'pkce',
    persistSession: true,
    storage,
    storageKey: configuration.storageKey,
  }) as const;
