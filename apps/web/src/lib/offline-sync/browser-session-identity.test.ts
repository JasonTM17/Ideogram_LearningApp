import { describe, expect, it, vi } from 'vitest';

import {
  forgetRememberedSessionIdentity,
  readBrowserSessionIdentity,
  readRememberedSessionIdentity,
  rememberSessionIdentity,
} from './browser-session-identity';

const userId = '123e4567-e89b-42d3-a456-426614174001';

const createStorage = (): Storage => {
  const values = new Map<string, string>();
  return {
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    get length() {
      return values.size;
    },
    removeItem: (key) => void values.delete(key),
    setItem: (key, value) => void values.set(key, value),
  };
};

describe('browser session identity', () => {
  it('distinguishes confirmed sign-out from an unavailable session endpoint', async () => {
    const signedOut = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 401 }));
    const unavailable = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('offline'));

    await expect(readBrowserSessionIdentity(signedOut)).resolves.toEqual({ kind: 'signed-out' });
    await expect(readBrowserSessionIdentity(unavailable)).resolves.toEqual({ kind: 'unknown' });
  });

  it('accepts only a valid authenticated user identity', async () => {
    const authenticated = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ sessionEpoch: 7, userId: userId.toUpperCase() }));
    const invalid = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ userId: 'not-a-uuid' }));

    await expect(readBrowserSessionIdentity(authenticated)).resolves.toEqual({
      kind: 'authenticated',
      sessionEpoch: 7,
      userId,
    });
    await expect(readBrowserSessionIdentity(invalid)).resolves.toEqual({ kind: 'unknown' });
  });

  it('remembers the last verified user so an offline reload can reopen that queue', () => {
    const storage = createStorage();
    rememberSessionIdentity(storage, { kind: 'authenticated', sessionEpoch: 7, userId });
    expect(readRememberedSessionIdentity(storage)).toEqual({
      kind: 'authenticated',
      sessionEpoch: 7,
      userId,
    });

    forgetRememberedSessionIdentity(storage);
    expect(readRememberedSessionIdentity(storage)).toBeNull();
  });
});
