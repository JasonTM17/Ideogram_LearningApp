import { describe, expect, it } from 'vitest';

import {
  createDataSubjectRequestApiRequest,
  createEmailOtpApiRequest,
  createSignOutApiRequest,
  plannedAuthApiRoutes,
} from './auth-api-requests';

describe('planned authentication API requests', () => {
  it('creates an invite-only email OTP request with a safe relative return target', () => {
    expect(
      createEmailOtpApiRequest({
        email: ' Minh@example.test ',
        returnTo: '/learn?deck=n5',
      }),
    ).toEqual({
      body: {
        email: 'minh@example.test',
        returnTo: '/learn?deck=n5',
      },
      method: 'POST',
      path: plannedAuthApiRoutes.emailOtp,
    });
  });

  it('rejects an unsafe return target that could become an open redirect', () => {
    expect(() =>
      createEmailOtpApiRequest({
        email: 'minh@example.test',
        returnTo: 'https://attacker.example',
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

  it('creates a same-origin sign-out mutation request envelope', () => {
    expect(createSignOutApiRequest()).toEqual({
      body: {},
      method: 'POST',
      path: plannedAuthApiRoutes.signOut,
    });
  });
});
