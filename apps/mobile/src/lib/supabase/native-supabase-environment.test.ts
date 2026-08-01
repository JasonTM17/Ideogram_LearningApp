import { describe, expect, it } from 'vitest';

import {
  NativeSupabaseConfigurationError,
  readNativeSupabaseConfiguration,
} from './native-supabase-environment';

const publishableKey = 'sb_publishable_mobile-test-key';
const legacyAnonKey = 'header.eyJyb2xlIjoiYW5vbiJ9.signature';

describe('native Supabase environment', () => {
  it('reads a strict HTTPS origin and stable storage namespace', () => {
    expect(
      readNativeSupabaseConfiguration({
        EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
        EXPO_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
      }),
    ).toEqual({
      publishableKey,
      storageKey: 'ideogram-project-supabase-co-auth-v1',
      url: 'https://project.supabase.co',
    });
  });

  it('accepts the local Supabase loopback origin and a legacy anon key', () => {
    expect(
      readNativeSupabaseConfiguration({
        EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: legacyAnonKey,
        EXPO_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
      }),
    ).toMatchObject({
      publishableKey: legacyAnonKey,
      storageKey: 'ideogram-127-0-0-1-54321-auth-v1',
    });
  });

  it.each([
    'http://supabase.example.test',
    'ftp://project.supabase.co',
    'https://user:password@project.supabase.co',
    'https://project.supabase.co/auth',
    'https://project.supabase.co/auth/..',
    'https://project.supabase.co/%2e%2e',
    'https://project.supabase.co?key=value',
    'https://project.supabase.co#fragment',
  ])('rejects an unsafe Supabase URL: %s', (url) => {
    expect(() =>
      readNativeSupabaseConfiguration({
        EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
        EXPO_PUBLIC_SUPABASE_URL: url,
      }),
    ).toThrow(NativeSupabaseConfigurationError);
  });

  it.each([
    'sb_secret_server-only',
    'sb_temp_preview-only',
    'header.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.signature',
    'not-a-supabase-key',
  ])('rejects a privileged or unsupported mobile key: %s', (key) => {
    expect(() =>
      readNativeSupabaseConfiguration({
        EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key,
        EXPO_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
      }),
    ).toThrow(NativeSupabaseConfigurationError);
  });

  it.each(['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY'])(
    'fails closed when %s is absent',
    (missingName) => {
      const environment: Record<string, string> = {
        EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
        EXPO_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
      };
      delete environment[missingName];

      expect(() => readNativeSupabaseConfiguration(environment)).toThrow(
        NativeSupabaseConfigurationError,
      );
    },
  );
});
