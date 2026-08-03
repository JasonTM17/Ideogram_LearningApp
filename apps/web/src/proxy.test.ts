import { describe, expect, it } from 'vitest';

import { shouldRefreshSupabaseSession } from './proxy';

describe('Supabase session Proxy policy', () => {
  it.each([
    '/',
    '/showcase',
    '/sign-in',
    '/auth/callback',
    '/api/v1/auth/email-otp',
    '/api/v1/health',
  ])('keeps session-independent route %s available without an Auth refresh', (pathname) => {
    expect(shouldRefreshSupabaseSession(pathname)).toBe(false);
  });

  it.each([
    '/today',
    '/learn',
    '/review',
    '/you',
    '/api/v1/learning/catalog',
    '/api/v1/auth/sign-out',
  ])('refreshes the verified session for protected route %s', (pathname) => {
    expect(shouldRefreshSupabaseSession(pathname)).toBe(true);
  });
});
