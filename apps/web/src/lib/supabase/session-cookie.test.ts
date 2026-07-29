import { describe, expect, it } from 'vitest';

import { hardenSessionCookieOptions } from './session-cookie';

describe('Supabase session cookie hardening', () => {
  it('enforces the production web-session contract', () => {
    expect(hardenSessionCookieOptions({ maxAge: 3600 }, true)).toMatchObject({
      httpOnly: true,
      maxAge: 3600,
      path: '/',
      sameSite: 'lax',
      secure: true,
    });
  });

  it('keeps cookie deletion possible while preserving security attributes', () => {
    expect(hardenSessionCookieOptions({ maxAge: 0 }, false)).toMatchObject({
      httpOnly: true,
      maxAge: 0,
      path: '/',
      sameSite: 'lax',
      secure: false,
    });
  });

  it('does not allow provider defaults to weaken the project policy', () => {
    expect(
      hardenSessionCookieOptions(
        {
          httpOnly: false,
          path: '/auth',
          sameSite: 'none',
          secure: false,
        },
        true,
      ),
    ).toMatchObject({
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: true,
    });
  });
});
