import { describe, expect, it } from 'vitest';

import { createTestStorage, findStoredKey } from './secure-session-test-helpers';

describe('secure session recovery', () => {
  it('purges a session whose encrypted chunk is missing', async () => {
    const { secureStore, storage } = createTestStorage();
    await storage.setItem('session', 'a'.repeat(90));
    secureStore.values.delete(findStoredKey(secureStore, '.chunk.1'));

    expect(await storage.getItem('session')).toBeNull();
    expect(secureStore.values.size).toBe(0);
  });

  it('purges a session whose integrity digest no longer matches', async () => {
    const { secureStore, storage } = createTestStorage();
    await storage.setItem('session', 'original');
    secureStore.values.set(findStoredKey(secureStore, '.chunk.0'), 'tampered');

    expect(await storage.getItem('session')).toBeNull();
    expect(secureStore.values.size).toBe(0);
  });

  it('purges all bounded chunk slots when a manifest is malformed', async () => {
    const { secureStore, storage } = createTestStorage();
    await storage.setItem('session', 'credential');
    secureStore.values.set(findStoredKey(secureStore, '.manifest'), '{"invalid":true}');

    expect(await storage.getItem('session')).toBeNull();
    expect(secureStore.values.size).toBe(0);
  });

  it('recovers an interrupted write from its non-ready manifest', async () => {
    const { secureStore, storage } = createTestStorage();
    secureStore.failSet = (key) => key.endsWith('.chunk.1');
    secureStore.failRemove = (key) => key.includes('.chunk.');

    await expect(storage.setItem('session', 'a'.repeat(90))).rejects.toMatchObject({
      code: 'storage_failure',
    });
    expect([...secureStore.values.keys()].some((key) => key.endsWith('.manifest'))).toBe(true);

    secureStore.failSet = undefined;
    secureStore.failRemove = undefined;

    expect(await storage.getItem('session')).toBeNull();
    expect(secureStore.values.size).toBe(0);
  });

  it('retains a deleting manifest when cleanup fails so a later read can retry', async () => {
    const { secureStore, storage } = createTestStorage();
    await storage.setItem('session', 'credential');
    secureStore.failRemove = (key) => key.endsWith('.chunk.0');

    await expect(storage.removeItem('session')).rejects.toMatchObject({
      code: 'storage_failure',
    });
    expect(findStoredKey(secureStore, '.manifest')).toBeTruthy();

    secureStore.failRemove = undefined;

    expect(await storage.getItem('session')).toBeNull();
    expect(secureStore.values.size).toBe(0);
  });
});
