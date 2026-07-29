import { describe, expect, it } from 'vitest';

import { createWebSessionCookieAttributes, getAuthSessionStatus } from './auth-session';

describe('auth session contract', () => {
  const session = {
    accessTokenExpiresAt: '2026-07-29T00:01:00.000Z',
    sessionId: 'session-1',
    userId: 'user-1',
  };

  it('marks sessions inside the refresh window as refresh-required', () => {
    expect(getAuthSessionStatus(session, new Date('2026-07-29T00:00:30.000Z'), 60)).toBe(
      'refresh_required',
    );
  });

  it('fails closed for expired or malformed expirations', () => {
    expect(getAuthSessionStatus(session, new Date('2026-07-29T00:01:00.000Z'))).toBe('expired');
    expect(
      getAuthSessionStatus(
        { ...session, accessTokenExpiresAt: 'not-a-timestamp' },
        new Date('2026-07-29T00:00:00.000Z'),
      ),
    ).toBe('expired');
  });

  it('creates a hardened server-only production cookie policy', () => {
    expect(
      createWebSessionCookieAttributes({ isProduction: true, maxAgeSeconds: 60 * 60 }),
    ).toEqual({
      httpOnly: true,
      maxAgeSeconds: 60 * 60,
      path: '/',
      sameSite: 'lax',
      secure: true,
    });
  });
});
