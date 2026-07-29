import { describe, expect, it } from 'vitest';

import {
  AuthenticationServiceError,
  readBearerToken,
  requireAuthenticatedUser,
  RequestAuthenticationError,
} from './request-auth';

import type { User } from '@supabase/supabase-js';

describe('request bearer parsing', () => {
  it('accepts a single strict bearer credential', () => {
    const request = new Request('https://app.example.test/api/v1/learning/catalog', {
      headers: { authorization: 'Bearer header.payload.signature' },
    });

    expect(readBearerToken(request)).toBe('header.payload.signature');
  });

  it.each([
    'bearer header.payload.signature',
    'Bearer',
    'Bearer token with spaces',
    'Basic dXNlcjpwYXNz',
    'Bearer token, Bearer second-token',
  ])('rejects malformed authorization: %s', (authorization) => {
    const request = new Request('https://app.example.test/api/v1/learning/catalog', {
      headers: { authorization },
    });

    expect(() => readBearerToken(request)).toThrow(RequestAuthenticationError);
  });

  it('allows cookie authentication when Authorization is absent', () => {
    expect(
      readBearerToken(new Request('https://app.example.test/api/v1/learning/catalog')),
    ).toBeNull();
  });

  it('maps absent, expired, or invalid credentials to an intentional 401', () => {
    expect(() => requireAuthenticatedUser(null, undefined)).toThrow(RequestAuthenticationError);
    expect(() => requireAuthenticatedUser(null, { status: 400 })).toThrow(
      RequestAuthenticationError,
    );
    expect(() => requireAuthenticatedUser(null, { status: 401 })).toThrow(
      RequestAuthenticationError,
    );
    expect(() => requireAuthenticatedUser(null, { status: 403 })).toThrow(
      RequestAuthenticationError,
    );
  });

  it('does not misreport an authentication upstream outage as invalid credentials', () => {
    expect(() => requireAuthenticatedUser(null, { status: 503 })).toThrow(
      AuthenticationServiceError,
    );
  });

  it('returns a verified user without inspecting browser-controlled claims', () => {
    const user = { id: 'learner-1' } as User;

    expect(requireAuthenticatedUser(user, null)).toBe(user);
  });
});
