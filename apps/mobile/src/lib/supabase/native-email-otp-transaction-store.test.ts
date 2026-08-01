import { describe, expect, it } from 'vitest';

import { SecureNativeEmailOtpTransactionStore } from './native-email-otp-transaction-store';

import type { AsyncKeyValueStorage } from '../secure-session';

const transactionKey = 'ideogram-project-auth-v1-native-auth-transaction-v1';
const state = 'a'.repeat(64);
const nonce = 'b'.repeat(64);
const transaction = {
  expiresAt: '2030-01-01T00:10:00.000Z',
  nonce,
  redirectUri: 'https://learn.ideogram.example/auth/callback',
  state,
};

const createStorage = (): AsyncKeyValueStorage => {
  const values = new Map<string, string>();
  return {
    getItem: async (key) => values.get(key) ?? null,
    removeItem: async (key) => {
      values.delete(key);
    },
    setItem: async (key, value) => {
      values.set(key, value);
    },
  };
};

describe('secure native email OTP transaction store', () => {
  it('consumes a matching transaction exactly once across store instances', async () => {
    const storage = createStorage();
    const writer = new SecureNativeEmailOtpTransactionStore(storage, transactionKey);
    const firstReader = new SecureNativeEmailOtpTransactionStore(storage, transactionKey);
    const secondReader = new SecureNativeEmailOtpTransactionStore(storage, transactionKey);
    await writer.replace(transaction);

    const results = await Promise.all([
      firstReader.consumeMatching(transaction),
      secondReader.consumeMatching(transaction),
    ]);

    expect(results.filter((result) => result !== null)).toHaveLength(1);
    expect(await writer.consumeMatching(transaction)).toBeNull();
  });

  it('does not burn a valid transaction for a nonce or callback mismatch', async () => {
    const store = new SecureNativeEmailOtpTransactionStore(createStorage(), transactionKey);
    await store.replace(transaction);

    await expect(
      store.consumeMatching({ ...transaction, nonce: 'c'.repeat(64) }),
    ).resolves.toBeNull();
    await expect(
      store.consumeMatching({ ...transaction, redirectUri: 'https://evil.example/auth/callback' }),
    ).resolves.toBeNull();
    await expect(store.consumeMatching(transaction)).resolves.toEqual(transaction);
  });

  it('rejects malformed values before persisting them', async () => {
    const store = new SecureNativeEmailOtpTransactionStore(createStorage(), transactionKey);

    await expect(store.replace({ ...transaction, state: 'short' })).rejects.toThrow(
      'transaction is invalid',
    );
  });
});
