import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { DurableSyncQueue } from '@ideogram/sync';

import {
  createExpoSecureSyncStorage,
  clearNativeOfflineSyncQueueIfOwnedBy,
  clearNativeOfflineSyncSessionNamespace,
  drainNativeOfflineSyncQueue,
  registerNativeOfflineSyncBackgroundTask,
  readNativeOfflineSyncSessionNamespace,
  unregisterNativeOfflineSyncBackgroundTask,
  updateNativeOfflineSyncRequestNamespace,
  writeNativeOfflineSyncSessionNamespace,
} from '../../lib/offline-sync';
import { clearNativeOfflineMediaCache } from '../../lib/offline-media/native-offline-media-cache';
import { bindNativeSessionProviderToNamespace } from '../../lib/offline-sync/namespace-bound-native-session-provider';
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

  const getCurrentQueue = useCallback(
    async (isCurrent: () => boolean = () => true) => {
      const session = await auth.sessionProvider();
      if (!session || !isCurrent()) return null;
      const previousQueue = queueRef.current;
      if (
        previousQueue &&
        (previousQueue.getNamespace().userId !== session.userId ||
          previousQueue.getNamespace().sessionEpoch !== session.sessionEpoch)
      ) {
        await clearNativeOfflineSyncSessionNamespace().catch(() => undefined);
        if (!isCurrent()) return null;
        await previousQueue.clear().catch(() => undefined);
        if (!isCurrent()) return null;
        try {
          clearNativeOfflineMediaCache();
        } catch {
          // A later authenticated mount retries cleanup before creating a new namespace.
        }
        await unregisterNativeOfflineSyncBackgroundTask().catch(() => undefined);
        if (!isCurrent()) return null;
        queueRef.current = null;
      }
      if (!queueRef.current) {
        const namespace = {
          sessionEpoch: session.sessionEpoch,
          userId: session.userId,
        };
        const queue = new DurableSyncQueue(createExpoSecureSyncStorage(namespace), namespace);
        await writeNativeOfflineSyncSessionNamespace(namespace);
        if (!isCurrent()) return null;
        queueRef.current = queue;
      }
      return { queue: queueRef.current, session };
    },
    [auth.sessionProvider],
  );

  const syncNow = useCallback(async () => {
    const current = await getCurrentQueue();
    if (!current || !auth.hasSession) return;
    await drainNativeOfflineSyncQueue(
      current.queue,
      bindNativeSessionProviderToNamespace(auth.sessionProvider, current.queue.getNamespace()),
      undefined,
      updateNativeOfflineSyncRequestNamespace(current.queue.getNamespace()),
    );
    await refreshPendingCount();
  }, [auth.hasSession, getCurrentQueue, refreshPendingCount]);

  useEffect(() => {
    let active = true;
    void auth.sessionProvider().then(async (session) => {
      if (!active) return;
      if (!session) {
        if (!auth.hasSession && !auth.isHydrating) {
          const storedNamespace = await readNativeOfflineSyncSessionNamespace().catch(() => null);
          if (!active) return;
          await clearNativeOfflineSyncSessionNamespace().catch(() => undefined);
          if (!active) return;
          await queueRef.current?.clear().catch(() => undefined);
          if (!active) return;
          if (storedNamespace) {
            await clearNativeOfflineSyncQueueIfOwnedBy(storedNamespace).catch(() => false);
            if (!active) return;
          }
        } else {
          await queueRef.current?.clear().catch(() => undefined);
          if (!active) return;
        }
        queueRef.current = null;
        setBlockedCount(0);
        setPendingCount(0);
        await unregisterNativeOfflineSyncBackgroundTask().catch(() => undefined);
        if (!active) return;
        if (!auth.hasSession && !auth.isHydrating) {
          try {
            clearNativeOfflineMediaCache();
          } catch {
            // Cache cleanup is retried by the next provider lifecycle pass.
          }
        }
        return;
      }
      await getCurrentQueue(() => active);
      if (!active) return;
      await refreshPendingCount();
      if (!active) return;
      await syncNow();
      if (!active) return;
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
      const latestSession = await auth.sessionProvider();
      if (
        !latestSession ||
        latestSession.userId !== queue.getNamespace().userId ||
        latestSession.sessionEpoch !== queue.getNamespace().sessionEpoch
      ) {
        await queue.clear();
        return false;
      }
      await refreshPendingCount();
      return true;
    },
    [auth.sessionProvider, getCurrentQueue, refreshPendingCount],
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
