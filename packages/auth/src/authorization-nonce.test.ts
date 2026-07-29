import { describe, expect, it } from 'vitest';

import { assertVerifiedIdTokenNonce } from './authorization-nonce';

describe('verified ID token nonce', () => {
  it('accepts an exact nonce from an already verified ID token', () => {
    expect(() =>
      assertVerifiedIdTokenNonce({
        expectedNonce: 'nonce-1',
        verifiedIdTokenNonce: 'nonce-1',
      }),
    ).not.toThrow();
  });

  it('rejects a missing or mismatched nonce', () => {
    expect(() =>
      assertVerifiedIdTokenNonce({
        expectedNonce: 'nonce-1',
        verifiedIdTokenNonce: 'nonce-2',
      }),
    ).toThrow(TypeError);
    expect(() =>
      assertVerifiedIdTokenNonce({
        expectedNonce: 'nonce-1',
        verifiedIdTokenNonce: undefined,
      }),
    ).toThrow(TypeError);
  });
});
