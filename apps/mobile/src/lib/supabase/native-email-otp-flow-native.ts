import * as Crypto from 'expo-crypto';

import { getNativeSupabaseClient } from './native-supabase-client';
import { completeNativeEmailOtp, startNativeEmailOtp } from './native-email-otp-flow';
import { createNativeEmailOtpTransactionStore } from './native-email-otp-transaction-store-native';

import type {
  NativeEmailOtpCompletionResult,
  NativeEmailOtpStartResult,
} from './native-email-otp-flow';

export const requestNativeEmailOtp = (email: string): Promise<NativeEmailOtpStartResult> => {
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
