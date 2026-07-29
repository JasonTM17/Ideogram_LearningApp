import { describe, expect, it } from 'vitest';

import { readSupabasePublicConfiguration, SupabaseConfigurationError } from './environment';

describe('Supabase public environment', () => {
  it('accepts HTTPS production configuration', () => {
    expect(
      readSupabasePublicConfiguration({
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'publishable-test-key',
        NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co/',
      }),
    ).toEqual({
      publishableKey: 'publishable-test-key',
      url: 'https://example.supabase.co',
    });
  });

  it('accepts local HTTP without weakening production URL checks', () => {
    expect(
      readSupabasePublicConfiguration({
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'local-key',
        NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
      }),
    ).toEqual({
      publishableKey: 'local-key',
      url: 'http://127.0.0.1:54321',
    });

    expect(() =>
      readSupabasePublicConfiguration({
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'unsafe-key',
        NEXT_PUBLIC_SUPABASE_URL: 'http://supabase.example.test',
      }),
    ).toThrow(/HTTPS/u);
  });

  it('fails without exposing configured credential values', () => {
    const credential = 'must-not-appear';

    let thrownError: unknown;
    try {
      readSupabasePublicConfiguration({
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: credential,
        NEXT_PUBLIC_SUPABASE_URL: `https://${credential}@example.supabase.co`,
      });
    } catch (error) {
      thrownError = error;
    }

    expect(thrownError).toBeInstanceOf(SupabaseConfigurationError);
    expect(String(thrownError)).not.toContain(credential);
  });

  it.each([
    'https://example.supabase.co/rest/v1',
    'https://example.supabase.co?redirect=https://attacker.example',
    'https://example.supabase.co/#fragment',
  ])('rejects a Supabase URL with a path, query, or fragment: %s', (url) => {
    expect(() =>
      readSupabasePublicConfiguration({
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'publishable-test-key',
        NEXT_PUBLIC_SUPABASE_URL: url,
      }),
    ).toThrow(/origin/u);
  });
});
