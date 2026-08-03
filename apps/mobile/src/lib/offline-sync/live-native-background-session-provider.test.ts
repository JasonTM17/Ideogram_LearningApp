import { describe, expect, it, vi } from 'vitest';

import { createLiveNativeBackgroundSessionProvider } from './live-native-background-session-provider';

const namespace = {
  sessionEpoch: 4,
  userId: '123e4567-e89b-42d3-a456-426614174000',
};

describe('live native background session provider', () => {
  it('reads current auth state on every call instead of retaining a stale token', async () => {
    const readSession = vi
      .fn()
      .mockResolvedValueOnce({ accessToken: 'token-a', userId: namespace.userId })
      .mockResolvedValueOnce({
        accessToken: 'token-b',
        userId: '123e4567-e89b-42d3-a456-426614174001',
      });
    const provider = createLiveNativeBackgroundSessionProvider(readSession, namespace);

    await expect(provider()).resolves.toMatchObject({ accessToken: 'token-a' });
    await expect(provider()).resolves.toBeNull();
    expect(readSession).toHaveBeenCalledTimes(2);
  });

  it('propagates auth storage failures to the OS-visible executor failure path', async () => {
    const provider = createLiveNativeBackgroundSessionProvider(async () => {
      throw new Error('auth storage unavailable');
    }, namespace);

    await expect(provider()).rejects.toThrow('auth storage unavailable');
  });
});
