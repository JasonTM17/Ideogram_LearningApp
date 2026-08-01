import { describe, expect, it } from 'vitest';

import { InstallationBoundSessionStorage } from './installation-bound-session-storage';
import { createNativeAuthTransactionStorageKey } from './native-auth-transaction-key';
import { createStorageForSecureStore, InMemorySecureStore } from './secure-session-test-helpers';
import { createSupabasePkceFlowRegistryKey } from './supabase-pkce-flow-registry';

const supabaseStorageKey = 'ideogram-project-auth-v1';

const createSentinel = (initiallyExists: boolean) => {
  let exists = initiallyExists;

  return {
    create: async () => {
      exists = true;
    },
    exists: async () => exists,
    read: () => exists,
  };
};

describe('installation-bound session storage', () => {
  it('keeps the current installation session when the sentinel exists', async () => {
    const innerStorage = createStorageForSecureStore(new InMemorySecureStore());
    const sentinel = createSentinel(true);
    await innerStorage.setItem(supabaseStorageKey, 'current-session');
    const storage = new InstallationBoundSessionStorage(innerStorage, supabaseStorageKey, sentinel);

    expect(await storage.getItem(supabaseStorageKey)).toBe('current-session');
  });

  it('scrubs retained session and every indexed PKCE verifier after reinstall', async () => {
    const secureStore = new InMemorySecureStore();
    const innerStorage = createStorageForSecureStore(secureStore);
    const flowIds = ['12345678abcdef00', 'abcdef0012345678'];
    await innerStorage.setItem(supabaseStorageKey, 'retained-session');
    await innerStorage.setItem(`${supabaseStorageKey}-code-verifier`, 'legacy-verifier');
    await innerStorage.setItem(
      createNativeAuthTransactionStorageKey(supabaseStorageKey),
      'retained-native-transaction',
    );
    await innerStorage.setItem(
      `${supabaseStorageKey}-flows-code-verifier`,
      JSON.stringify(flowIds),
    );
    await Promise.all(
      flowIds.map((flowId) =>
        innerStorage.setItem(
          `${supabaseStorageKey}-flow-${flowId}-code-verifier`,
          `verifier-${flowId}`,
        ),
      ),
    );
    const sentinel = createSentinel(false);
    const storage = new InstallationBoundSessionStorage(innerStorage, supabaseStorageKey, sentinel);

    expect(await storage.getItem(supabaseStorageKey)).toBeNull();
    expect(sentinel.read()).toBe(true);
    expect(secureStore.values.size).toBe(0);
  });

  it('tracks a PKCE slot outside the SDK index so reinstall cleanup can scrub it', async () => {
    const secureStore = new InMemorySecureStore();
    const innerStorage = createStorageForSecureStore(secureStore);
    const flowId = 'fedcba0987654321';
    const storage = new InstallationBoundSessionStorage(
      innerStorage,
      supabaseStorageKey,
      createSentinel(true),
    );

    await storage.setItem(`${supabaseStorageKey}-flow-${flowId}-code-verifier`, 'orphan-verifier');

    expect(await innerStorage.getItem(createSupabasePkceFlowRegistryKey(supabaseStorageKey))).toBe(
      JSON.stringify([flowId]),
    );

    const reinstallStorage = new InstallationBoundSessionStorage(
      innerStorage,
      supabaseStorageKey,
      createSentinel(false),
    );
    await expect(reinstallStorage.getItem(supabaseStorageKey)).resolves.toBeNull();
    expect(secureStore.values.size).toBe(0);
  });

  it('serializes shadow registry updates for concurrent PKCE starts', async () => {
    const secureStore = new InMemorySecureStore();
    const innerStorage = createStorageForSecureStore(secureStore);
    const storage = new InstallationBoundSessionStorage(
      innerStorage,
      supabaseStorageKey,
      createSentinel(true),
    );
    const flowIds = ['11111111abcdef00', '22222222abcdef00', '33333333abcdef00'];

    await Promise.all(
      flowIds.map((flowId) =>
        storage.setItem(`${supabaseStorageKey}-flow-${flowId}-code-verifier`, `verifier-${flowId}`),
      ),
    );

    const registry = await innerStorage.getItem(
      createSupabasePkceFlowRegistryKey(supabaseStorageKey),
    );
    expect(JSON.parse(registry ?? '[]')).toEqual(expect.arrayContaining(flowIds));
  });

  it('clears retained credentials before accepting the first new write', async () => {
    const innerStorage = createStorageForSecureStore(new InMemorySecureStore());
    await innerStorage.setItem(supabaseStorageKey, 'retained-session');
    const storage = new InstallationBoundSessionStorage(
      innerStorage,
      supabaseStorageKey,
      createSentinel(false),
    );

    await storage.setItem(supabaseStorageKey, 'new-installation-session');

    expect(await storage.getItem(supabaseStorageKey)).toBe('new-installation-session');
  });

  it('fails closed and retries when retained credential cleanup fails', async () => {
    const secureStore = new InMemorySecureStore();
    const innerStorage = createStorageForSecureStore(secureStore);
    await innerStorage.setItem(supabaseStorageKey, 'retained-session');
    const sentinel = createSentinel(false);
    const storage = new InstallationBoundSessionStorage(innerStorage, supabaseStorageKey, sentinel);
    secureStore.failRemove = () => true;

    await expect(storage.getItem(supabaseStorageKey)).rejects.toMatchObject({
      code: 'storage_failure',
    });
    expect(sentinel.read()).toBe(false);

    secureStore.failRemove = undefined;
    expect(await storage.getItem(supabaseStorageKey)).toBeNull();
    expect(sentinel.read()).toBe(true);
  });
});
