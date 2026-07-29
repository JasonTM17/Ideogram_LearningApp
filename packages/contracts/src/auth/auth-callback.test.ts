import { describe, expect, it } from 'vitest';

import { isExactAllowedRedirectUri, parseAuthorizationCodeCallback } from './auth-callback';

describe('authorization-code callback contract', () => {
  it('accepts an authorization code with a non-empty state and exact redirect URI', () => {
    expect(
      parseAuthorizationCodeCallback({
        code: 'one-time-code',
        redirectUri: 'https://app.ideogram.example/auth/callback',
        state: 'opaque-state',
      }),
    ).toEqual({
      callback: {
        code: 'one-time-code',
        redirectUri: 'https://app.ideogram.example/auth/callback',
        state: 'opaque-state',
      },
      status: 'ok',
    });
  });

  it('fails closed when callback state is missing', () => {
    expect(
      parseAuthorizationCodeCallback({
        code: 'one-time-code',
        redirectUri: 'https://app.ideogram.example/auth/callback',
      }),
    ).toEqual({ reason: 'missing_state', status: 'error' });
  });

  it('rejects bearer tokens in the callback payload', () => {
    expect(
      parseAuthorizationCodeCallback({
        access_token: 'never-accept-this',
        code: 'one-time-code',
        redirectUri: 'https://app.ideogram.example/auth/callback',
        state: 'opaque-state',
      }),
    ).toEqual({ reason: 'bearer_token_in_callback', status: 'error' });
  });

  it('uses exact callback matching rather than a host or prefix match', () => {
    const allowedRedirectUris = ['https://app.ideogram.example/auth/callback'];

    expect(
      isExactAllowedRedirectUri(
        'https://app.ideogram.example/auth/callback?next=https://attacker.example',
        allowedRedirectUris,
      ),
    ).toBe(false);
  });
});
