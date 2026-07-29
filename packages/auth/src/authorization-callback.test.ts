import { describe, expect, it } from 'vitest';

import { consumeAuthorizationCallback } from './authorization-callback';

describe('consumeAuthorizationCallback', () => {
  const transaction = {
    codeChallenge: 'challenge',
    codeVerifier: 'verifier',
    expiresAt: '2026-07-29T00:10:00.000Z',
    nonce: 'nonce',
    redirectUri: 'https://app.ideogram.example/auth/callback',
    state: 'state-1',
  };

  it('consumes a matching PKCE transaction exactly once', async () => {
    const transactions = new Map([[transaction.state, transaction]]);
    const transactionStore = {
      consumeMatching: async ({ redirectUri, state }: { redirectUri: string; state: string }) => {
        const pending = transactions.get(state) ?? null;

        if (!pending || pending.redirectUri !== redirectUri) {
          return null;
        }

        transactions.delete(state);
        return pending;
      },
    };

    const firstResult = await consumeAuthorizationCallback({
      allowedRedirectUris: [transaction.redirectUri],
      callback: {
        code: 'one-time-code',
        redirectUri: transaction.redirectUri,
        state: transaction.state,
      },
      now: new Date('2026-07-29T00:00:00.000Z'),
      transactionStore,
    });

    const replayResult = await consumeAuthorizationCallback({
      allowedRedirectUris: [transaction.redirectUri],
      callback: {
        code: 'replayed-code',
        redirectUri: transaction.redirectUri,
        state: transaction.state,
      },
      now: new Date('2026-07-29T00:00:01.000Z'),
      transactionStore,
    });

    expect(firstResult).toEqual({
      code: 'one-time-code',
      codeVerifier: 'verifier',
      nonce: 'nonce',
      redirectUri: transaction.redirectUri,
      status: 'ready',
    });
    expect(replayResult).toEqual({ reason: 'missing_or_replayed_state', status: 'error' });
  });

  it('fails closed before storage access when callback state is absent', async () => {
    let consumeCalls = 0;

    const result = await consumeAuthorizationCallback({
      allowedRedirectUris: [transaction.redirectUri],
      callback: {
        code: 'one-time-code',
        redirectUri: transaction.redirectUri,
      },
      transactionStore: {
        consumeMatching: async () => {
          consumeCalls += 1;
          return transaction;
        },
      },
    });

    expect(result).toEqual({ reason: 'missing_state', status: 'error' });
    expect(consumeCalls).toBe(0);
  });

  it('rejects expired transactions after atomic consumption', async () => {
    const result = await consumeAuthorizationCallback({
      allowedRedirectUris: [transaction.redirectUri],
      callback: {
        code: 'one-time-code',
        redirectUri: transaction.redirectUri,
        state: transaction.state,
      },
      now: new Date('2026-07-29T00:10:00.000Z'),
      transactionStore: {
        consumeMatching: async () => transaction,
      },
    });

    expect(result).toEqual({ reason: 'expired_state', status: 'error' });
  });

  it('does not consume a state when an otherwise allowed callback URI differs', async () => {
    const alternateCallbackUri = 'ideogram://auth/callback';
    const transactions = new Map([[transaction.state, transaction]]);
    const transactionStore = {
      consumeMatching: async ({ redirectUri, state }: { redirectUri: string; state: string }) => {
        const pending = transactions.get(state) ?? null;

        if (!pending || pending.redirectUri !== redirectUri) {
          return null;
        }

        transactions.delete(state);
        return pending;
      },
    };

    const mismatchedResult = await consumeAuthorizationCallback({
      allowedRedirectUris: [transaction.redirectUri, alternateCallbackUri],
      callback: {
        code: 'attacker-code',
        redirectUri: alternateCallbackUri,
        state: transaction.state,
      },
      now: new Date('2026-07-29T00:00:00.000Z'),
      transactionStore,
    });
    const validResult = await consumeAuthorizationCallback({
      allowedRedirectUris: [transaction.redirectUri, alternateCallbackUri],
      callback: {
        code: 'one-time-code',
        redirectUri: transaction.redirectUri,
        state: transaction.state,
      },
      now: new Date('2026-07-29T00:00:00.000Z'),
      transactionStore,
    });

    expect(mismatchedResult).toEqual({ reason: 'missing_or_replayed_state', status: 'error' });
    expect(validResult.status).toBe('ready');
  });
});
