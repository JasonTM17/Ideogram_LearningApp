import { normalizeAuthEmailAddress } from '@ideogram/contracts';

import {
  readNativeAuthCallbackConfiguration,
  type NativeAuthCallbackConfiguration,
} from './native-auth-callback-configuration';
import { parseNativeEmailOtpCallback } from './native-email-otp-callback-parser';
import type {
  NativeEmailOtpTransaction,
  NativeEmailOtpTransactionStore,
} from './native-email-otp-transaction-store';

const callbackEntropyPattern = /^[a-f0-9]{64}$/;
const transactionLifetimeMilliseconds = 10 * 60 * 1_000;
const otpConfigurationErrorCodes = new Set(['email_provider_disabled', 'otp_disabled']);

export interface NativeEmailOtpAuthPort {
  exchangeCodeForSession: (
    code: string,
    options: { flowId: string },
  ) => Promise<{ error: unknown | null }>;
  signInWithOtp: (input: {
    email: string;
    options: { emailRedirectTo: string; shouldCreateUser: false };
  }) => Promise<{ error: unknown | null }>;
}

export type NativeEmailOtpStartResult =
  { status: 'sent' } | { reason: 'invalid_email' | 'request_failed'; status: 'error' };

export type NativeEmailOtpCompletionResult =
  | { status: 'complete' }
  | {
      reason:
        | 'authorization_denied'
        | 'bearer_token_in_callback'
        | 'exchange_failed'
        | 'expired_state'
        | 'invalid_callback'
        | 'missing_code'
        | 'missing_or_replayed_state'
        | 'redirect_uri_mismatch';
      status: 'error';
    };

const encodeEntropy = (bytes: Uint8Array): string =>
  Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');

const createTransaction = (
  redirectUri: string,
  randomBytes: (byteLength: number) => Uint8Array,
  now: Date,
): NativeEmailOtpTransaction => {
  const state = encodeEntropy(randomBytes(32));
  const nonce = encodeEntropy(randomBytes(32));
  if (
    !callbackEntropyPattern.test(state) ||
    !callbackEntropyPattern.test(nonce) ||
    state === nonce
  ) {
    throw new TypeError('Native callback entropy source is invalid.');
  }

  return {
    expiresAt: new Date(now.getTime() + transactionLifetimeMilliseconds).toISOString(),
    nonce,
    redirectUri,
    state,
  };
};

const createEmailRedirectUrl = (transaction: NativeEmailOtpTransaction): string => {
  const redirectUrl = new URL(transaction.redirectUri);
  redirectUrl.searchParams.set('native_state', transaction.state);
  redirectUrl.searchParams.set('native_nonce', transaction.nonce);
  return redirectUrl.toString();
};

const readErrorStatus = (error: unknown): number | null => {
  if (!error || typeof error !== 'object' || !('status' in error)) {
    return null;
  }

  return typeof error.status === 'number' ? error.status : null;
};

const readErrorCode = (error: unknown): string | null => {
  if (!error || typeof error !== 'object' || !('code' in error)) {
    return null;
  }

  return typeof error.code === 'string' ? error.code : null;
};

const getOtpStartResult = (error: unknown | null): NativeEmailOtpStartResult => {
  if (!error) {
    return { status: 'sent' };
  }

  const status = readErrorStatus(error);
  if (status === 400 || status === 422) {
    return otpConfigurationErrorCodes.has(readErrorCode(error) ?? '')
      ? { reason: 'request_failed', status: 'error' }
      : { status: 'sent' };
  }

  return { reason: 'request_failed', status: 'error' };
};

export const startNativeEmailOtp = async ({
  auth,
  email,
  now = new Date(),
  randomBytes,
  readConfiguration = readNativeAuthCallbackConfiguration,
  transactionStore,
}: {
  auth: NativeEmailOtpAuthPort;
  email: string;
  now?: Date;
  randomBytes: (byteLength: number) => Uint8Array;
  readConfiguration?: () => NativeAuthCallbackConfiguration;
  transactionStore: NativeEmailOtpTransactionStore;
}): Promise<NativeEmailOtpStartResult> => {
  let normalizedEmail: string;
  try {
    normalizedEmail = normalizeAuthEmailAddress(email);
  } catch {
    return { reason: 'invalid_email', status: 'error' };
  }

  try {
    const configuration = readConfiguration();
    const transaction = createTransaction(configuration.callbackUrl, randomBytes, now);
    await transactionStore.replace(transaction);
    const { error } = await auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: createEmailRedirectUrl(transaction),
        shouldCreateUser: false,
      },
    });
    return getOtpStartResult(error);
  } catch {
    return { reason: 'request_failed', status: 'error' };
  }
};

export const completeNativeEmailOtp = async ({
  auth,
  callbackUrl,
  now = new Date(),
  readConfiguration = readNativeAuthCallbackConfiguration,
  transactionStore,
}: {
  auth: NativeEmailOtpAuthPort;
  callbackUrl: string;
  now?: Date;
  readConfiguration?: () => NativeAuthCallbackConfiguration;
  transactionStore: NativeEmailOtpTransactionStore;
}): Promise<NativeEmailOtpCompletionResult> => {
  let configuration: NativeAuthCallbackConfiguration;
  try {
    configuration = readConfiguration();
  } catch {
    return { reason: 'invalid_callback', status: 'error' };
  }

  const parsed = parseNativeEmailOtpCallback(callbackUrl, configuration.callbackUrl);
  if (parsed.status === 'error') {
    return parsed;
  }

  let transaction: NativeEmailOtpTransaction | null;
  try {
    transaction = await transactionStore.consumeMatching({
      nonce: parsed.callback.nonce,
      redirectUri: configuration.callbackUrl,
      state: parsed.callback.state,
    });
  } catch {
    return { reason: 'missing_or_replayed_state', status: 'error' };
  }
  if (!transaction) {
    return { reason: 'missing_or_replayed_state', status: 'error' };
  }

  if (Date.parse(transaction.expiresAt) <= now.getTime()) {
    return { reason: 'expired_state', status: 'error' };
  }

  try {
    const { error } = await auth.exchangeCodeForSession(parsed.callback.code, {
      flowId: parsed.callback.flowId,
    });
    return error ? { reason: 'exchange_failed', status: 'error' } : { status: 'complete' };
  } catch {
    return { reason: 'exchange_failed', status: 'error' };
  }
};
