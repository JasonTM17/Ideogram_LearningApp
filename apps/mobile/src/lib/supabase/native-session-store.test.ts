import { describe, expect, it, vi } from 'vitest';

import { bindNativeSessionStore } from './native-session-store-binding';
import { NativeSessionStore, type SupabaseSessionLike } from './native-session-store';

const firstUserId = '11111111-1111-4111-8111-111111111111';
const secondUserId = '22222222-2222-4222-8222-222222222222';

const session = (userId: string, accessToken: string): SupabaseSessionLike => ({
  access_token: accessToken,
  user: { id: userId },
});

describe('native session store', () => {
  it('notifies when the initial Supabase event has no session', () => {
    const listener = vi.fn();
    const store = new NativeSessionStore();
    store.subscribe(listener);

    store.applySession(null);
    store.applySession(null);

    expect(store.getSnapshot()).toBeNull();
    expect(store.isInitialized()).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('keeps the epoch stable across token rotation for the same account', async () => {
    const store = new NativeSessionStore();
    store.applySession(session(firstUserId, 'access.token.one'));
    const firstSnapshot = store.getSnapshot();

    store.applySession(session(firstUserId, 'access.token.two'));
    const refreshedSnapshot = await store.createSessionProvider()();

    expect(firstSnapshot).toMatchObject({ sessionEpoch: 1, userId: firstUserId });
    expect(refreshedSnapshot).toEqual({
      accessToken: 'access.token.two',
      sessionEpoch: 1,
      userId: firstUserId,
    });
  });

  it('increments the epoch on sign-out and account switch', () => {
    const store = new NativeSessionStore();
    store.applySession(session(firstUserId, 'first.token'));
    store.applySession(null);
    expect(store.getSnapshot()).toBeNull();

    store.applySession(session(secondUserId, 'second.token'));

    expect(store.getSnapshot()).toMatchObject({
      sessionEpoch: 3,
      userId: secondUserId,
    });
  });

  it('fails closed when persisted session material is malformed', () => {
    const store = new NativeSessionStore();
    store.applySession(session(firstUserId, 'valid.token'));

    store.applySession({
      access_token: 'token with spaces',
      user: { id: firstUserId },
    });

    expect(store.getSnapshot()).toBeNull();
  });

  it('notifies subscribers without letting one listener break the others', () => {
    const listenerErrors: unknown[] = [];
    const store = new NativeSessionStore({
      onListenerError: (error) => listenerErrors.push(error),
    });
    const workingListener = vi.fn();
    store.subscribe(() => {
      throw new Error('listener failed');
    });
    store.subscribe(workingListener);

    store.applySession(session(firstUserId, 'valid.token'));

    expect(workingListener).toHaveBeenCalledTimes(1);
    expect(listenerErrors).toHaveLength(1);
  });

  it('binds synchronously to Supabase auth events and unsubscribes cleanly', () => {
    let callback: ((event: string, value: SupabaseSessionLike | null) => void) | undefined;
    const unsubscribe = vi.fn();
    const store = new NativeSessionStore();
    const dispose = bindNativeSessionStore(
      {
        onAuthStateChange: (nextCallback) => {
          callback = nextCallback;
          return { data: { subscription: { unsubscribe } } };
        },
      },
      store,
    );

    callback?.('SIGNED_IN', session(firstUserId, 'valid.token'));
    expect(store.getSnapshot()).toMatchObject({ userId: firstUserId });

    dispose();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
