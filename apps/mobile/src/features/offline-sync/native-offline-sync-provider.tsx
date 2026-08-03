import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { DurableSyncQueue } from '@ideogram/sync';

import {
  createExpoSecureSyncStorage,
  clearNativeOfflineSyncSessionNamespace,
  drainNativeOfflineSyncQueue,
  registerNativeOfflineSyncBackgroundTask,
  unregisterNativeOfflineSyncBackgroundTask,
  writeNativeOfflineSyncSessionNamespace,
} from '../../lib/offline-sync';
import { clearNativeOfflineMediaCache } from '../../lib/offline-media/native-offline-media-cache';
import { useNativeAuthSession } from '../auth/native-auth-session-provider';

import type { SyncMutationKind } from '@ideogram/contracts';
import type { DurableSyncQueue as DurableSyncQueueType } from '@ideogram/sync';
import type { ReactNode } from 'react';

interface NativeOfflineSyncState {
  blockedCount: number;
  discardBlocked: () => Promise<void>;
  enqueue: (
    kind: SyncMutationKind,
    idempotencyKey: string,
    payload: Record<string, unknown>,
  ) => Promise<boolean>;
  pendingCount: number;
  retryBlocked: () => Promise<void>;
  syncNow: () => Promise<void>;
}

const NativeOfflineSyncContext = createContext<NativeOfflineSyncState | null>(null);
export function NativeOfflineSyncProvider({ children }: { children: ReactNode }) {
  const auth = useNativeAuthSession();
  const queueRef = useRef<DurableSyncQueueType | null>(null);
  const [blockedCount, setBlockedCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  const refreshPendingCount = useCallback(async () => {
    const mutations = (await queueRef.current?.getPending()) ?? [];
    setBlockedCount(mutations.filter((mutation) => mutation.status === 'blocked').length);
    setPendingCount(mutations.filter((mutation) => mutation.status === 'pending').length);
  }, []);

  const getCurrentQueue = useCallback(async () => {
    const session = await auth.sessionProvider();
    if (!session) return null;
    const previousQueue = queueRef.current;
    if (
      previousQueue &&
      (previousQueue.getNamespace().userId !== session.userId ||
        previousQueue.getNamespace().sessionEpoch !== session.sessionEpoch)
    ) {
      await previousQueue.clear().catch(() => undefined);
      try {
        clearNativeOfflineMediaCache();
      } catch {
        // A later authenticated mount retries cleanup before creating a new namespace.
      }
      await unregisterNativeOfflineSyncBackgroundTask().catch(() => undefined);
      queueRef.current = null;
    }
    if (!queueRef.current) {
      queueRef.current = new DurableSyncQueue(createExpoSecureSyncStorage(), {
        sessionEpoch: session.sessionEpoch,
        userId: session.userId,
      });
      await writeNativeOfflineSyncSessionNamespace({
        sessionEpoch: session.sessionEpoch,
        userId: session.userId,
      });
    }
    return { queue: queueRef.current, session };
  }, [auth.sessionProvider]);

  const syncNow = useCallback(async () => {
    const current = await getCurrentQueue();
    if (!current || !auth.hasSession) return;
    await drainNativeOfflineSyncQueue(current.queue, async () => current.session);
    await refreshPendingCount();
  }, [auth.hasSession, getCurrentQueue, refreshPendingCount]);

  useEffect(() => {
    let active = true;
    void auth.sessionProvider().then(async (session) => {
      if (!active || !session) {
        await queueRef.current?.clear().catch(() => undefined);
        if (!auth.hasSession && !auth.isHydrating) {
          await createExpoSecureSyncStorage()
            .clear()
            .catch(() => undefined);
          await clearNativeOfflineSyncSessionNamespace().catch(() => undefined);
        }
        queueRef.current = null;
        setBlockedCount(0);
        setPendingCount(0);
        await unregisterNativeOfflineSyncBackgroundTask().catch(() => undefined);
        if (!auth.hasSession && !auth.isHydrating) {
          try {
            clearNativeOfflineMediaCache();
          } catch {
            // Cache cleanup is retried by the next provider lifecycle pass.
          }
        }
        return;
      }
      await getCurrentQueue();
      await refreshPendingCount();
      await syncNow();
      await registerNativeOfflineSyncBackgroundTask().catch(() => false);
    });
    return () => {
      active = false;
    };
  }, [
    auth.hasSession,
    auth.isHydrating,
    auth.sessionEpoch,
    auth.sessionProvider,
    getCurrentQueue,
    refreshPendingCount,
    syncNow,
  ]);

  const enqueue = useCallback(
    async (kind: SyncMutationKind, idempotencyKey: string, payload: Record<string, unknown>) => {
      const current = await getCurrentQueue();
      if (!current) return false;
      const queue = current.queue;
      await queue.enqueue({ idempotencyKey, kind, operationId: idempotencyKey, payload });
      await refreshPendingCount();
      return true;
    },
    [getCurrentQueue, refreshPendingCount],
  );

  const retryBlocked = useCallback(async () => {
    if (!queueRef.current || !auth.hasSession) return;
    await queueRef.current.retryBlocked();
    await syncNow();
  }, [auth.hasSession, syncNow]);

  const discardBlocked = useCallback(async () => {
    if (!queueRef.current || !auth.hasSession) return;
    await queueRef.current.discardBlocked();
    await refreshPendingCount();
  }, [auth.hasSession, refreshPendingCount]);

  return (
    <NativeOfflineSyncContext.Provider
      value={{ blockedCount, discardBlocked, enqueue, pendingCount, retryBlocked, syncNow }}
    >
      {children}
    </NativeOfflineSyncContext.Provider>
  );
}

export const useNativeOfflineSync = (): NativeOfflineSyncState => {
  const context = useContext(NativeOfflineSyncContext);
  if (!context)
    throw new Error('useNativeOfflineSync must be used within NativeOfflineSyncProvider.');
  return context;
};
