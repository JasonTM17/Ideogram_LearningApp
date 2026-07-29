/**
 * Compares the nonce retained with a PKCE transaction to a nonce claim from an
 * ID token that an OIDC adapter has already verified for issuer, audience,
 * signature, and expiry. This helper deliberately does not parse JWTs.
 */
export const assertVerifiedIdTokenNonce = ({
  expectedNonce,
  verifiedIdTokenNonce,
}: {
  expectedNonce: string;
  verifiedIdTokenNonce: unknown;
}): void => {
  if (
    typeof verifiedIdTokenNonce !== 'string' ||
    expectedNonce.length === 0 ||
    verifiedIdTokenNonce !== expectedNonce
  ) {
    throw new TypeError(
      'The verified ID token nonce does not match the authorization transaction.',
    );
  }
};
