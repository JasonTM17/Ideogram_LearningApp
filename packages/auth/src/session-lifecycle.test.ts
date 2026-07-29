import { describe, expect, it } from 'vitest';

import { getRefreshDecision, signOutAndClearLocalSession } from './session-lifecycle';

describe('session lifecycle', () => {
  it('identifies an access token that needs refreshing before it expires', () => {
    expect(
      getRefreshDecision(
        {
          accessTokenExpiresAt: '2026-07-29T00:01:00.000Z',
          sessionId: 'session-1',
          userId: 'user-1',
        },
        new Date('2026-07-29T00:00:30.000Z'),
      ),
    ).toBe('refresh_required');
  });

  it('clears local credentials even when the remote sign-out request fails', async () => {
    const calls: string[] = [];

    await expect(
      signOutAndClearLocalSession({
        remoteSignOut: {
          signOut: async () => {
            calls.push('remote');
            throw new Error('network unavailable');
          },
        },
        sessionStorage: {
          clear: async () => {
            calls.push('clear');
          },
        },
      }),
    ).rejects.toThrow('network unavailable');

    expect(calls).toEqual(['clear', 'remote']);
  });

  it('starts local cleanup without waiting for a hung remote sign-out request', async () => {
    const calls: string[] = [];
    const remoteSignOutNeverResolves = new Promise<void>(() => undefined);

    void signOutAndClearLocalSession({
      remoteSignOut: {
        signOut: () => {
          calls.push('remote');
          return remoteSignOutNeverResolves;
        },
      },
      sessionStorage: {
        clear: async () => {
          calls.push('clear');
        },
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(calls).toEqual(['clear', 'remote']);
  });
});
