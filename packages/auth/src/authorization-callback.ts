import { isExactAllowedRedirectUri, parseAuthorizationCodeCallback } from '@ideogram/contracts';

import type { AuthorizationTransaction } from './pkce-transaction';

export interface AuthorizationTransactionStore {
  /**
   * Atomically consumes only a transaction whose state and callback URI both
   * match. A URI mismatch must leave the transaction available for its valid
   * callback, preventing a malformed callback from burning the state value.
   */
  consumeMatching: ({
    redirectUri,
    state,
  }: {
    redirectUri: string;
    state: string;
  }) => Promise<AuthorizationTransaction | null>;
}

export type AuthorizationCallbackConsumption =
  | {
      code: string;
      codeVerifier: string;
      nonce: string;
      redirectUri: string;
      status: 'ready';
    }
  | {
      reason:
        | 'authorization_denied'
        | 'bearer_token_in_callback'
        | 'expired_state'
        | 'invalid_callback'
        | 'missing_code'
        | 'missing_or_replayed_state'
        | 'missing_state'
        | 'redirect_uri_mismatch';
      status: 'error';
    };

export const consumeAuthorizationCallback = async ({
  allowedRedirectUris,
  callback,
  now = new Date(),
  transactionStore,
}: {
  allowedRedirectUris: readonly string[];
  callback: unknown;
  now?: Date;
  transactionStore: AuthorizationTransactionStore;
}): Promise<AuthorizationCallbackConsumption> => {
  const parsed = parseAuthorizationCodeCallback(callback);
  if (parsed.status === 'error') {
    return parsed;
  }

  if (!isExactAllowedRedirectUri(parsed.callback.redirectUri, allowedRedirectUris)) {
    return { reason: 'redirect_uri_mismatch', status: 'error' };
  }

  const transaction = await transactionStore.consumeMatching({
    redirectUri: parsed.callback.redirectUri,
    state: parsed.callback.state,
  });
  if (!transaction || transaction.state !== parsed.callback.state) {
    return { reason: 'missing_or_replayed_state', status: 'error' };
  }

  if (
    transaction.redirectUri !== parsed.callback.redirectUri ||
    !isExactAllowedRedirectUri(transaction.redirectUri, allowedRedirectUris)
  ) {
    return { reason: 'redirect_uri_mismatch', status: 'error' };
  }

  const transactionExpiresAt = Date.parse(transaction.expiresAt);
  if (!Number.isFinite(transactionExpiresAt) || transactionExpiresAt <= now.getTime()) {
    return { reason: 'expired_state', status: 'error' };
  }

  return {
    code: parsed.callback.code,
    codeVerifier: transaction.codeVerifier,
    nonce: transaction.nonce,
    redirectUri: transaction.redirectUri,
    status: 'ready',
  };
};
