import { describe, expect, it } from 'vitest';

import { createAuthorizationTransaction } from './pkce-transaction';

describe('createAuthorizationTransaction', () => {
  it('creates independent state, nonce, verifier, and SHA-256 challenge values', async () => {
    let call = 0;
    const randomBytesSource = {
      randomBytes: (byteLength: number) => {
        call += 1;
        return new Uint8Array(byteLength).fill(call);
      },
    };

    const transaction = await createAuthorizationTransaction(
      {
        lifetimeMilliseconds: 5 * 60 * 1_000,
        now: new Date('2026-07-29T00:00:00.000Z'),
        redirectUri: 'https://app.ideogram.example/auth/callback',
      },
      randomBytesSource,
      {
        sha256: async () => new Uint8Array(32).fill(4),
      },
    );

    expect(transaction.codeChallenge).toHaveLength(43);
    expect(transaction.codeVerifier).not.toBe(transaction.state);
    expect(transaction.nonce).not.toBe(transaction.state);
    expect(transaction.expiresAt).toBe('2026-07-29T00:05:00.000Z');
  });

  it('rejects malformed entropy and digest adapters before producing PKCE values', async () => {
    await expect(
      createAuthorizationTransaction(
        { redirectUri: 'https://app.ideogram.example/auth/callback' },
        {
          randomBytes: () => new Uint8Array(1),
        },
        {
          sha256: async () => new Uint8Array(32),
        },
      ),
    ).rejects.toThrow('codeVerifier must provide exactly 64 random bytes.');

    await expect(
      createAuthorizationTransaction(
        { redirectUri: 'https://app.ideogram.example/auth/callback' },
        {
          randomBytes: (byteLength) => new Uint8Array(byteLength),
        },
        {
          sha256: async () => new Uint8Array(31),
        },
      ),
    ).rejects.toThrow('sha256 must provide a 32-byte digest.');
  });
});
