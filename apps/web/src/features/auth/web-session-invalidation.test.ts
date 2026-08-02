import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  broadcastWebSessionInvalidation,
  subscribeToWebSessionInvalidation,
} from './web-session-invalidation';

describe('web session invalidation', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('notifies another tab listener when a successful sign-out broadcasts', () => {
    const listeners = new Set<(event: StorageEvent) => void>();
    const setItem = vi.fn();
    vi.stubGlobal('window', {
      addEventListener: (_type: string, listener: (event: StorageEvent) => void) => {
        listeners.add(listener);
      },
      localStorage: { setItem },
      removeEventListener: (_type: string, listener: (event: StorageEvent) => void) => {
        listeners.delete(listener);
      },
    });
    const onInvalidate = vi.fn();
    const unsubscribe = subscribeToWebSessionInvalidation(onInvalidate);

    broadcastWebSessionInvalidation();
    expect(setItem).toHaveBeenCalledWith(
      'ideogram-learning:web-session-invalidated:v1',
      expect.any(String),
    );

    for (const listener of listeners) {
      listener({ key: 'ideogram-learning:web-session-invalidated:v1' } as StorageEvent);
    }
    expect(onInvalidate).toHaveBeenCalledTimes(1);

    unsubscribe();
    expect(listeners).toHaveLength(0);
  });

  it('does not fail a completed sign-out when browser storage is blocked', () => {
    vi.stubGlobal('window', {
      localStorage: {
        setItem: () => {
          throw new Error('storage denied');
        },
      },
    });

    expect(broadcastWebSessionInvalidation).not.toThrow();
  });
});
