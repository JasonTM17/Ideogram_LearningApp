import { describe, expect, it } from 'vitest';

import { ChunkedSecureSessionStorage } from './chunked-secure-session-storage';
import { getUtf8ByteLength } from './secure-session-chunks';
import {
  createTestStorage,
  deterministicSha256,
  InMemorySecureStore,
} from './secure-session-test-helpers';

import type { SecureSessionStorageError } from './secure-session-storage-types';

describe('chunked secure session storage', () => {
  it('round-trips a session without exposing the caller key in SecureStore keys', async () => {
    const { secureStore, storage } = createTestStorage();

    await storage.setItem('sb-project-auth-token', '{"access_token":"opaque"}');

    expect(await storage.getItem('sb-project-auth-token')).toBe('{"access_token":"opaque"}');
    expect([...secureStore.values.keys()]).not.toContainEqual(
      expect.stringContaining('sb-project-auth-token'),
    );
    expect(secureStore.values.size).toBe(2);
  });

  it('splits Unicode values on code-point boundaries within the byte limit', async () => {
    const { secureStore, storage } = createTestStorage();
    const value = `header.${'界'.repeat(60)}.signature`;

    await storage.setItem('session', value);

    const chunkValues = [...secureStore.values.entries()]
      .filter(([key]) => key.includes('.chunk.'))
      .map(([, chunk]) => chunk);
    expect(chunkValues.length).toBeGreaterThan(1);
    expect(chunkValues.every((chunk) => getUtf8ByteLength(chunk) <= 64)).toBe(true);
    expect(chunkValues.join('')).toBe(value);
    expect(await storage.getItem('session')).toBe(value);
  });

  it('removes obsolete chunks when a shorter refreshed session replaces a longer one', async () => {
    const { secureStore, storage } = createTestStorage();

    await storage.setItem('session', 'a'.repeat(150));
    expect([...secureStore.values.keys()].filter((key) => key.includes('.chunk.'))).toHaveLength(3);

    await storage.setItem('session', 'fresh');

    expect(await storage.getItem('session')).toBe('fresh');
    expect([...secureStore.values.keys()].filter((key) => key.includes('.chunk.'))).toHaveLength(1);
  });

  it('clears every manifest and chunk during local sign-out', async () => {
    const { secureStore, storage } = createTestStorage();
    await storage.setItem('session', 'a'.repeat(150));

    await storage.removeItem('session');

    expect(await storage.getItem('session')).toBeNull();
    expect(secureStore.values.size).toBe(0);
  });

  it('rejects oversized sessions before writing credentials', async () => {
    const { secureStore, storage } = createTestStorage({ maximumChunks: 2 });

    await expect(storage.setItem('session', 'a'.repeat(129))).rejects.toMatchObject({
      code: 'invalid_input',
    });
    expect(secureStore.values.size).toBe(0);
  });

  it('serializes concurrent refresh writes for the same session key', async () => {
    const { storage } = createTestStorage();

    await Promise.all([
      storage.setItem('session', 'first-refresh'),
      storage.setItem('session', 'second-refresh'),
    ]);

    expect(await storage.getItem('session')).toBe('second-refresh');
  });

  it('maps provider failures to an opaque storage error', async () => {
    const { secureStore, storage } = createTestStorage();
    secureStore.failGet = () => true;

    await expect(storage.getItem('session')).rejects.toEqual(
      expect.objectContaining<Partial<SecureSessionStorageError>>({
        code: 'storage_failure',
        message: 'Secure session storage operation failed.',
      }),
    );
  });

  it('rejects invalid integrity provider output', async () => {
    const storage = new ChunkedSecureSessionStorage(new InMemorySecureStore(), {
      ...deterministicSha256,
      sha256: async () => 'not-a-digest',
    });

    await expect(storage.setItem('session', 'value')).rejects.toMatchObject({
      code: 'storage_failure',
    });
  });
});
