import { describe, expect, it, vi } from 'vitest';

import { completeNativeEmailOtp, startNativeEmailOtp } from './native-email-otp-flow';
import { SecureNativeEmailOtpTransactionStore } from './native-email-otp-transaction-store';

import type { AsyncKeyValueStorage } from '../secure-session';
import type { NativeEmailOtpAuthPort } from './native-email-otp-flow';

const callbackUrl = 'https://learn.ideogram.example/auth/callback';
const configuration = { callbackUrl, isDevelopment: false };
const flowId = '12345678abcdef00';
const state = 'a'.repeat(64);
const nonce = 'b'.repeat(64);

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

const createStore = () =>
  new SecureNativeEmailOtpTransactionStore(createStorage(), 'ideogram-project-native-transaction');

const createAuth = (): NativeEmailOtpAuthPort => ({
  exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
  signInWithOtp: vi.fn().mockResolvedValue({ error: null }),
});

const createCallbackUrl = (parameters = '') =>
  `${callbackUrl}?code=one-time-code&sb_flow_id=${flowId}&native_state=${state}&native_nonce=${nonce}${parameters}`;

describe('native email OTP flow', () => {
  it('creates a non-enumerating invite-only OTP request with state and nonce', async () => {
    const auth = createAuth();
    const store = createStore();
    let call = 0;

    await expect(
      startNativeEmailOtp({
        auth,
        email: '  Learner@Example.Test ',
        randomBytes: (length) => new Uint8Array(length).fill(++call),
        readConfiguration: () => configuration,
        transactionStore: store,
      }),
    ).resolves.toEqual({ status: 'sent' });

    const request = vi.mocked(auth.signInWithOtp).mock.calls[0]?.[0];
    expect(request).toMatchObject({
      email: 'learner@example.test',
      options: { shouldCreateUser: false },
    });
    expect(request?.options.emailRedirectTo).toContain(`native_state=${'01'.repeat(32)}`);
    expect(request?.options.emailRedirectTo).toContain(`native_nonce=${'02'.repeat(32)}`);
  });

  it('does not call Supabase for an invalid email', async () => {
    const auth = createAuth();

    await expect(
      startNativeEmailOtp({
        auth,
        email: 'not-an-email',
        randomBytes: (length) => new Uint8Array(length).fill(1),
        readConfiguration: () => configuration,
        transactionStore: createStore(),
      }),
    ).resolves.toEqual({ reason: 'invalid_email', status: 'error' });
    expect(auth.signInWithOtp).not.toHaveBeenCalled();
  });

  it('keeps ambiguous invalid-account responses non-enumerating', async () => {
    const auth = createAuth();
    let entropyCall = 0;
    vi.mocked(auth.signInWithOtp).mockResolvedValue({
      error: { code: 'user_not_found', status: 422 },
    });

    await expect(
      startNativeEmailOtp({
        auth,
        email: 'learner@example.test',
        randomBytes: (length) => new Uint8Array(length).fill(++entropyCall),
        readConfiguration: () => configuration,
        transactionStore: createStore(),
      }),
    ).resolves.toEqual({ status: 'sent' });
  });

  it('does not hide a disabled provider as an account result', async () => {
    const auth = createAuth();
    let entropyCall = 0;
    vi.mocked(auth.signInWithOtp).mockResolvedValue({
      error: { code: 'email_provider_disabled', status: 400 },
    });

    await expect(
      startNativeEmailOtp({
        auth,
        email: 'learner@example.test',
        randomBytes: (length) => new Uint8Array(length).fill(++entropyCall),
        readConfiguration: () => configuration,
        transactionStore: createStore(),
      }),
    ).resolves.toEqual({ reason: 'request_failed', status: 'error' });
  });

  it('exchanges only a matching, unexpired callback code with its exact PKCE flow', async () => {
    const auth = createAuth();
    const store = createStore();
    await store.replace({
      expiresAt: '2030-01-01T00:10:00.000Z',
      nonce,
      redirectUri: callbackUrl,
      state,
    });

    await expect(
      completeNativeEmailOtp({
        auth,
        callbackUrl: createCallbackUrl(),
        now: new Date('2030-01-01T00:00:00.000Z'),
        readConfiguration: () => configuration,
        transactionStore: store,
      }),
    ).resolves.toEqual({ status: 'complete' });
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith('one-time-code', { flowId });
  });

  it.each([
    ['https://evil.example/auth/callback?code=one-time-code', 'redirect_uri_mismatch'],
    [createCallbackUrl('&access_token=forbidden'), 'bearer_token_in_callback'],
    [createCallbackUrl('&native_nonce='), 'invalid_callback'],
    [createCallbackUrl('&native_state=evil'), 'invalid_callback'],
  ])('rejects an unsafe callback before exchanging: %s', async (unsafeUrl, reason) => {
    const auth = createAuth();

    await expect(
      completeNativeEmailOtp({
        auth,
        callbackUrl: unsafeUrl,
        readConfiguration: () => configuration,
        transactionStore: createStore(),
      }),
    ).resolves.toEqual({ reason, status: 'error' });
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it('consumes an expired state without exchanging its one-time code', async () => {
    const auth = createAuth();
    const store = createStore();
    await store.replace({
      expiresAt: '2030-01-01T00:00:00.000Z',
      nonce,
      redirectUri: callbackUrl,
      state,
    });

    await expect(
      completeNativeEmailOtp({
        auth,
        callbackUrl: createCallbackUrl(),
        now: new Date('2030-01-01T00:01:00.000Z'),
        readConfiguration: () => configuration,
        transactionStore: store,
      }),
    ).resolves.toEqual({ reason: 'expired_state', status: 'error' });
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });
});
