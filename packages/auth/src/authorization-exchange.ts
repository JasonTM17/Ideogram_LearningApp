import { assertVerifiedIdTokenNonce } from './authorization-nonce';

import type { AuthorizationCallbackConsumption } from './authorization-callback';

export type ReadyAuthorizationCallback = Extract<
  AuthorizationCallbackConsumption,
  { status: 'ready' }
>;

export interface AuthorizationCodeExchangePort<TResult> {
  /**
   * The adapter must verify the ID token issuer, audience, signature, and
   * expiry before returning the nonce claim as `verifiedIdTokenNonce`.
   */
  exchange: (input: {
    code: string;
    codeVerifier: string;
    redirectUri: string;
  }) => Promise<TResult & { verifiedIdTokenNonce: unknown }>;
}

/**
 * Exchanges an already-consumed authorization callback and binds the verified
 * ID-token nonce to its one-use transaction before returning a session result.
 */
export const exchangeAuthorizationCode = async <TResult>(
  callback: ReadyAuthorizationCallback,
  exchangePort: AuthorizationCodeExchangePort<TResult>,
): Promise<TResult> => {
  const exchangeResult = await exchangePort.exchange({
    code: callback.code,
    codeVerifier: callback.codeVerifier,
    redirectUri: callback.redirectUri,
  });

  assertVerifiedIdTokenNonce({
    expectedNonce: callback.nonce,
    verifiedIdTokenNonce: exchangeResult.verifiedIdTokenNonce,
  });

  return exchangeResult;
};
