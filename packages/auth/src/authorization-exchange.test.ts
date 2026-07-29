import { describe, expect, it } from 'vitest';

import { exchangeAuthorizationCode } from './authorization-exchange';

describe('authorization code exchange', () => {
  const callback = {
    code: 'one-time-code',
    codeVerifier: 'pkce-verifier',
    nonce: 'nonce-1',
    redirectUri: 'https://app.ideogram.example/auth/callback',
    status: 'ready' as const,
  };

  it('passes only the stored callback material to the adapter and verifies its nonce', async () => {
    const calls: unknown[] = [];

    await expect(
      exchangeAuthorizationCode(callback, {
        exchange: async (input) => {
          calls.push(input);
          return { accessBoundary: 'session', verifiedIdTokenNonce: 'nonce-1' };
        },
      }),
    ).resolves.toEqual({ accessBoundary: 'session', verifiedIdTokenNonce: 'nonce-1' });

    expect(calls).toEqual([
      {
        code: 'one-time-code',
        codeVerifier: 'pkce-verifier',
        redirectUri: 'https://app.ideogram.example/auth/callback',
      },
    ]);
  });

  it('rejects an exchange result whose verified nonce differs from the transaction', async () => {
    await expect(
      exchangeAuthorizationCode(callback, {
        exchange: async () => ({ verifiedIdTokenNonce: 'nonce-2' }),
      }),
    ).rejects.toThrow('verified ID token nonce does not match');
  });
});
