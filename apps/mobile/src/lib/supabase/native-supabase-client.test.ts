import { describe, expect, it } from 'vitest';

import { createNativeSupabaseAuthOptions } from './native-supabase-auth-options';

describe('native Supabase client options', () => {
  it('enforces PKCE, manual callback parsing, persistent secure storage and flow IDs', () => {
    const storage = {
      getItem: async () => null,
      removeItem: async () => undefined,
      setItem: async () => undefined,
    };

    const options = createNativeSupabaseAuthOptions(
      { storageKey: 'ideogram-project-auth-v1' },
      storage,
    );

    expect(options).toMatchObject({
      autoRefreshToken: false,
      detectSessionInUrl: false,
      experimental: {
        appendPkceFlowIdToRedirects: true,
      },
      flowType: 'pkce',
      persistSession: true,
      storage,
      storageKey: 'ideogram-project-auth-v1',
    });
    expect(options).not.toHaveProperty('lock');
    expect(options).not.toHaveProperty('userStorage');
  });
});
