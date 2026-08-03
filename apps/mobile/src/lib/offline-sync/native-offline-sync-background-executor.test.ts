import { describe, expect, it, vi } from 'vitest';

import { executeNativeOfflineSyncBackgroundTask } from './native-offline-sync-background-executor';

import type { NativeApiSessionProvider } from '@ideogram/api-client/native';
import type { SyncNamespace } from '@ideogram/contracts';
import type { DurableSyncQueue } from '@ideogram/sync';

const namespace: SyncNamespace = {
  sessionEpoch: 4,
  userId: '123e4567-e89b-42d3-a456-426614174000',
};
const queue = {} as DurableSyncQueue;
const validSessionProvider: NativeApiSessionProvider = async () => ({
  accessToken: 'local-test-token',
  sessionEpoch: namespace.sessionEpoch,
  userId: namespace.userId,
});

const dependencies = (overrides: Record<string, unknown> = {}) => ({
  clearQueue: vi.fn(async () => undefined),
  createSessionProvider: vi.fn(async () => validSessionProvider),
  drainQueue: vi.fn(async () => ({ blocked: 0, completed: 1, retried: 0 })),
  readCurrentNamespace: vi.fn(async () => namespace),
  readQueuedSync: vi.fn(async () => ({ namespace, queue })),
  ...overrides,
});

describe('native offline sync background executor', () => {
  it('returns success without transport when no mutation is queued', async () => {
    const context = dependencies({ readQueuedSync: vi.fn(async () => null) });

    await expect(executeNativeOfflineSyncBackgroundTask(context)).resolves.toBe('success');
    expect(context.createSessionProvider).not.toHaveBeenCalled();
    expect(context.drainQueue).not.toHaveBeenCalled();
  });

  it('clears a previous account queue before any session or transport call', async () => {
    const context = dependencies({
      readCurrentNamespace: vi.fn(async () => ({ ...namespace, sessionEpoch: 5 })),
    });

    await expect(executeNativeOfflineSyncBackgroundTask(context)).resolves.toBe('success');
    expect(context.clearQueue).toHaveBeenCalledOnce();
    expect(context.createSessionProvider).not.toHaveBeenCalled();
    expect(context.drainQueue).not.toHaveBeenCalled();
  });

  it('preserves queued work when the matching native session is unavailable', async () => {
    const unavailableSession: NativeApiSessionProvider = async () => null;
    const context = dependencies({
      createSessionProvider: vi.fn(async () => unavailableSession),
    });

    await expect(executeNativeOfflineSyncBackgroundTask(context)).resolves.toBe('success');
    expect(context.clearQueue).not.toHaveBeenCalled();
    expect(context.drainQueue).not.toHaveBeenCalled();
  });

  it('reports failure when transport leaves a retryable mutation queued', async () => {
    const context = dependencies({
      drainQueue: vi.fn(async () => ({ blocked: 0, completed: 0, retried: 1 })),
    });

    await expect(executeNativeOfflineSyncBackgroundTask(context)).resolves.toBe('failed');
    expect(context.drainQueue).toHaveBeenCalledWith(queue, expect.any(Function), namespace);
  });

  it('reports success only after the bounded drain returns without retries', async () => {
    const context = dependencies();

    await expect(executeNativeOfflineSyncBackgroundTask(context)).resolves.toBe('success');
    expect(context.drainQueue).toHaveBeenCalledWith(queue, expect.any(Function), namespace);
  });

  it('rechecks the namespace after session lookup and clears a raced account switch', async () => {
    const readCurrentNamespace = vi
      .fn()
      .mockResolvedValueOnce(namespace)
      .mockResolvedValueOnce({ ...namespace, sessionEpoch: 5 });
    const context = dependencies({ readCurrentNamespace });

    await expect(executeNativeOfflineSyncBackgroundTask(context)).resolves.toBe('success');
    expect(context.clearQueue).toHaveBeenCalledOnce();
    expect(context.drainQueue).not.toHaveBeenCalled();
  });

  it('does not clear from inside a drain when the namespace changes mid-flight', async () => {
    const readCurrentNamespace = vi
      .fn()
      .mockResolvedValueOnce(namespace)
      .mockResolvedValueOnce(namespace)
      .mockResolvedValueOnce({ ...namespace, sessionEpoch: 5 });
    const drainQueue = vi.fn(async (_queue, sessionProvider: NativeApiSessionProvider) => {
      await expect(sessionProvider()).rejects.toMatchObject({ code: 'SESSION_CHANGED' });
      return { blocked: 0, completed: 0, retried: 1 };
    });
    const context = dependencies({ drainQueue, readCurrentNamespace });

    await expect(executeNativeOfflineSyncBackgroundTask(context)).resolves.toBe('failed');
    expect(context.clearQueue).not.toHaveBeenCalled();
  });

  it('reports OS success for a stable blocked mutation that needs user action', async () => {
    const context = dependencies({
      drainQueue: vi.fn(async () => ({ blocked: 1, completed: 0, retried: 0 })),
    });

    await expect(executeNativeOfflineSyncBackgroundTask(context)).resolves.toBe('success');
  });

  it('converts dependency failures into an OS-visible failed result', async () => {
    const context = dependencies({
      readQueuedSync: vi.fn(async () => {
        throw new Error('secure storage unavailable');
      }),
    });

    await expect(executeNativeOfflineSyncBackgroundTask(context)).resolves.toBe('failed');
  });

  it('reports an OS-visible failure when native session storage cannot be read', async () => {
    const context = dependencies({
      createSessionProvider: vi.fn(async () => {
        throw new Error('session storage unavailable');
      }),
    });

    await expect(executeNativeOfflineSyncBackgroundTask(context)).resolves.toBe('failed');
    expect(context.drainQueue).not.toHaveBeenCalled();
  });
});
