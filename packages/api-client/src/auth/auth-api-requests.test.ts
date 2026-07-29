import { describe, expect, it } from 'vitest';

import {
  createAuthorizationCodeExchangeApiRequest,
  createDataSubjectRequestApiRequest,
  createEmailOtpApiRequest,
  plannedAuthApiRoutes,
} from './auth-api-requests';

describe('planned authentication API requests', () => {
  const callbackUri = 'https://app.ideogram.example/auth/callback';

  it('creates an invite-only email OTP request', () => {
    expect(
      createEmailOtpApiRequest({
        allowedRedirectUris: [callbackUri],
        email: ' Minh@example.test ',
        redirectUri: callbackUri,
      }),
    ).toEqual({
      body: {
        email: 'minh@example.test',
        redirectUri: callbackUri,
        shouldCreateUser: false,
      },
      method: 'POST',
      path: plannedAuthApiRoutes.emailOtp,
    });
  });

  it('rejects a callback URI that only resembles an allowed URI', () => {
    expect(() =>
      createEmailOtpApiRequest({
        allowedRedirectUris: [callbackUri],
        email: 'minh@example.test',
        redirectUri: `${callbackUri}?next=https://attacker.example`,
      }),
    ).toThrow(TypeError);
  });

  it('binds an authorization exchange to an exact callback URI, state, and nonce', () => {
    expect(
      createAuthorizationCodeExchangeApiRequest({
        allowedRedirectUris: [callbackUri],
        code: 'one-time-code',
        codeVerifier: 'pkce-verifier',
        nonce: 'id-token-nonce',
        redirectUri: callbackUri,
        state: 'opaque-state',
      }),
    ).toEqual({
      body: {
        code: 'one-time-code',
        codeVerifier: 'pkce-verifier',
        nonce: 'id-token-nonce',
        redirectUri: callbackUri,
        state: 'opaque-state',
      },
      method: 'POST',
      path: plannedAuthApiRoutes.callback,
    });

    expect(() =>
      createAuthorizationCodeExchangeApiRequest({
        allowedRedirectUris: [callbackUri],
        code: 'one-time-code',
        codeVerifier: 'pkce-verifier',
        nonce: 'id-token-nonce',
        redirectUri: 'https://attacker.example/auth/callback',
        state: 'opaque-state',
      }),
    ).toThrow(TypeError);
  });

  it('keeps data-subject request identity server-bound', () => {
    expect(
      createDataSubjectRequestApiRequest({
        idempotencyKey: '123e4567-e89b-42d3-a456-426614174000',
        requestKind: 'deletion',
      }),
    ).toEqual({
      body: {
        idempotencyKey: '123e4567-e89b-42d3-a456-426614174000',
        requestKind: 'deletion',
      },
      method: 'POST',
      path: '/api/v1/privacy/data-subject-requests',
    });
  });

  it('rejects a request kind injected outside the typed client boundary', () => {
    expect(() =>
      createDataSubjectRequestApiRequest({
        idempotencyKey: '123e4567-e89b-42d3-a456-426614174000',
        requestKind: 'purge_everything' as never,
      }),
    ).toThrow(TypeError);
  });
});
