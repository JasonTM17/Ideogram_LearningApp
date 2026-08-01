import * as Crypto from 'expo-crypto';

import { normalizeAuthEmailAddress } from '@ideogram/contracts';

import { getNativeSupabaseClient } from './native-supabase-client';
import { completeNativeEmailOtp, startNativeEmailOtp } from './native-email-otp-flow';
import { createNativeEmailOtpTransactionStore } from './native-email-otp-transaction-store-native';

import type {
  NativeEmailOtpCompletionResult,
  NativeEmailOtpStartResult,
} from './native-email-otp-flow';

export const requestNativeEmailOtp = (email: string): Promise<NativeEmailOtpStartResult> => {
  try {
    normalizeAuthEmailAddress(email);
  } catch {
    return Promise.resolve({ reason: 'invalid_email', status: 'error' });
  }

  const client = getNativeSupabaseClient();
  return startNativeEmailOtp({
    auth: client.auth,
    email,
    randomBytes: Crypto.getRandomBytes,
    transactionStore: createNativeEmailOtpTransactionStore(),
  });
};

export const finishNativeEmailOtp = (
  callbackUrl: string,
): Promise<NativeEmailOtpCompletionResult> => {
  const client = getNativeSupabaseClient();
  return completeNativeEmailOtp({
    auth: client.auth,
    callbackUrl,
    transactionStore: createNativeEmailOtpTransactionStore(),
  });
};
