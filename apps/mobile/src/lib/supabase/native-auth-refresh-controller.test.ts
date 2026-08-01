import { describe, expect, it, vi } from 'vitest';

import {
  NativeAuthRefreshController,
  type NativeAppStateSource,
} from './native-auth-refresh-controller';

const createAppStateSource = (initialState: string | null) => {
  let listener: ((state: string) => void) | undefined;
  const remove = vi.fn();
  const source: NativeAppStateSource = {
    currentState: initialState,
    subscribe: (nextListener) => {
      listener = nextListener;
      return { remove };
    },
  };

  return {
    emit: (state: string) => listener?.(state),
    remove,
    source,
  };
};

describe('native auth refresh controller', () => {
  it('starts refresh while active and stops when backgrounded', async () => {
    const appState = createAppStateSource('active');
    const auth = {
      startAutoRefresh: vi.fn().mockResolvedValue(undefined),
      stopAutoRefresh: vi.fn().mockResolvedValue(undefined),
    };
    const controller = new NativeAuthRefreshController(auth, appState.source);

    controller.start();
    await controller.flush();
    appState.emit('background');
    await controller.flush();

    expect(auth.startAutoRefresh).toHaveBeenCalledTimes(1);
    expect(auth.stopAutoRefresh).toHaveBeenCalledTimes(1);
  });

  it('serializes rapid app-state transitions in arrival order', async () => {
    const appState = createAppStateSource('background');
    const events: string[] = [];
    const auth = {
      startAutoRefresh: vi.fn(async () => {
        events.push('start');
      }),
      stopAutoRefresh: vi.fn(async () => {
        events.push('stop');
      }),
    };
    const controller = new NativeAuthRefreshController(auth, appState.source);

    controller.start();
    appState.emit('active');
    appState.emit('inactive');
    appState.emit('active');
    await controller.flush();

    expect(events).toEqual(['stop', 'start', 'stop', 'start']);
  });

  it('is idempotent for duplicate states and duplicate starts', async () => {
    const appState = createAppStateSource('active');
    const auth = {
      startAutoRefresh: vi.fn().mockResolvedValue(undefined),
      stopAutoRefresh: vi.fn().mockResolvedValue(undefined),
    };
    const controller = new NativeAuthRefreshController(auth, appState.source);

    controller.start();
    controller.start();
    appState.emit('active');
    await controller.flush();

    expect(auth.startAutoRefresh).toHaveBeenCalledTimes(1);
  });

  it('reports transition errors without poisoning later state changes', async () => {
    const appState = createAppStateSource('active');
    const errors: unknown[] = [];
    const auth = {
      startAutoRefresh: vi
        .fn()
        .mockRejectedValueOnce(new Error('start failed'))
        .mockResolvedValue(undefined),
      stopAutoRefresh: vi.fn().mockResolvedValue(undefined),
    };
    const controller = new NativeAuthRefreshController(auth, appState.source, {
      onError: (error) => errors.push(error),
    });

    controller.start();
    await controller.flush();
    appState.emit('active');
    await controller.flush();

    expect(auth.startAutoRefresh).toHaveBeenCalledTimes(2);
    expect(errors).toHaveLength(1);
  });

  it('removes the listener and stops refresh on disposal', async () => {
    const appState = createAppStateSource('active');
    const auth = {
      startAutoRefresh: vi.fn().mockResolvedValue(undefined),
      stopAutoRefresh: vi.fn().mockResolvedValue(undefined),
    };
    const controller = new NativeAuthRefreshController(auth, appState.source);
    controller.start();
    await controller.flush();

    await controller.dispose();
    appState.emit('active');
    await controller.flush();

    expect(appState.remove).toHaveBeenCalledTimes(1);
    expect(auth.stopAutoRefresh).toHaveBeenCalledTimes(1);
    expect(() => controller.start()).toThrow();
  });
});
