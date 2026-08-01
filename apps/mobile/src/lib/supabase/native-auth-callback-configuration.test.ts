import { describe, expect, it } from 'vitest';

import { readNativeAuthCallbackConfiguration } from './native-auth-callback-configuration';

describe('native auth callback configuration', () => {
  it('uses the dedicated custom scheme only as a development fallback', () => {
    expect(readNativeAuthCallbackConfiguration({}, true)).toEqual({
      callbackUrl: 'ideogram-learning://auth/callback',
      isDevelopment: true,
    });
  });

  it('requires an explicit claimed HTTPS callback in production', () => {
    expect(() => readNativeAuthCallbackConfiguration({}, false)).toThrow(
      'EXPO_PUBLIC_AUTH_CALLBACK_URL',
    );
    expect(() =>
      readNativeAuthCallbackConfiguration(
        { EXPO_PUBLIC_AUTH_CALLBACK_URL: 'ideogram-learning://auth/callback' },
        false,
      ),
    ).toThrow('claimed HTTPS');
  });

  it('accepts only an exact HTTPS callback origin and path in production', () => {
    expect(
      readNativeAuthCallbackConfiguration(
        { EXPO_PUBLIC_AUTH_CALLBACK_URL: 'https://learn.ideogram.example/auth/callback' },
        false,
      ),
    ).toEqual({
      callbackUrl: 'https://learn.ideogram.example/auth/callback',
      isDevelopment: false,
    });
  });

  it.each([
    'https://learn.ideogram.example/auth/callback?next=/today',
    'https://user@learn.ideogram.example/auth/callback',
    'https://learn.ideogram.example/other',
    'http://learn.ideogram.example/auth/callback',
  ])('rejects a malformed or unclaimed callback URL: %s', (callbackUrl) => {
    expect(() =>
      readNativeAuthCallbackConfiguration({ EXPO_PUBLIC_AUTH_CALLBACK_URL: callbackUrl }, false),
    ).toThrow();
  });
});
