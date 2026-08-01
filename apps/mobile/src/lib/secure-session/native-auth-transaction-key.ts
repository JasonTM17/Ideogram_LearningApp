export const createNativeAuthTransactionStorageKey = (supabaseStorageKey: string): string =>
  `${supabaseStorageKey}-native-auth-transaction-v1`;
