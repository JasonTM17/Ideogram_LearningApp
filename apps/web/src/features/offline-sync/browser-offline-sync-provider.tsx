'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { DurableSyncQueue, type DurableSyncQueue as DurableSyncQueueType } from '@ideogram/sync';

import {
  clearWebSyncSessionEpochs,
  subscribeToWebSessionInvalidation,
} from '@/features/auth/web-session-invalidation';
import { createBrowserSyncQueueStorage } from '@/lib/offline-sync/browser-sync-storage';
import {
  forgetRememberedSessionIdentity,
  readBrowserSessionIdentity,
  readRememberedSessionIdentity,
  rememberSessionIdentity,
} from '@/lib/offline-sync/browser-session-identity';

import type { SyncMutationKind } from '@ideogram/contracts';
import type { BrowserSessionIdentity } from '@/lib/offline-sync/browser-session-identity';
import type { ReactNode } from 'react';

interface BrowserOfflineSyncState {
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

const BrowserOfflineSyncContext = createContext<BrowserOfflineSyncState | null>(null);
const scheduleBackgroundSync = async (): Promise<void> => {
  if (!('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.register('/offline-sync-service-worker.js');
  const readyRegistration = await navigator.serviceWorker.ready;
  const backgroundSync = readyRegistration as ServiceWorkerRegistration & {
    sync?: { register: (tag: string) => Promise<void> };
  };
  await backgroundSync.sync?.register('ideogram-learning-offline-sync-v1');
  void registration;
};

const sendMutation = async (mutation: {
  kind: SyncMutationKind;
  payload: Record<string, unknown>;
}): Promise<'blocked' | 'completed' | 'retry'> => {
  let body = mutation.payload;
  let path = '/api/v1/learning/activities/submit';
  if (mutation.kind === 'review') path = '/api/v1/learning/reviews/submit';
  if (mutation.kind === 'placement-answer') {
    const sessionId = mutation.payload.placementSessionId;
    const input = mutation.payload.input;
    if (typeof sessionId !== 'string' || !input || typeof input !== 'object') return 'blocked';
    path = `/api/v1/learning/placement/sessions/${sessionId}/answers`;
    body = input as Record<string, unknown>;
  }
  if (mutation.kind === 'placement-submit') {
    const sessionId = mutation.payload.placementSessionId;
    if (typeof sessionId !== 'string') return 'blocked';
    path = `/api/v1/learning/placement/sessions/${sessionId}/submit`;
    body = {};
  }
  try {
    const response = await fetch(path, {
      body: JSON.stringify(body),
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      method: 'POST',
      redirect: 'error',
    });
    if (response.ok) return 'completed';
    return response.status === 400 ||
      response.status === 401 ||
      response.status === 403 ||
      response.status === 404 ||
      response.status === 409
      ? 'blocked'
      : 'retry';
  } catch {
    return 'retry';
  }
};

export function BrowserOfflineSyncProvider({ children }: { children: ReactNode }) {
  const queueRef = useRef<DurableSyncQueueType | null>(null);
  const [blockedCount, setBlockedCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  const refreshPendingCount = useCallback(async () => {
    const mutations = (await queueRef.current?.getPending()) ?? [];
    setBlockedCount(mutations.filter((mutation) => mutation.status === 'blocked').length);
    setPendingCount(mutations.filter((mutation) => mutation.status === 'pending').length);
  }, []);

  const ensureCurrentQueue = useCallback(
    async (knownIdentity?: BrowserSessionIdentity): Promise<DurableSyncQueueType | null> => {
      const identity = knownIdentity ?? (await readBrowserSessionIdentity());
      const existingQueue = queueRef.current;
      const rememberedIdentity = readRememberedSessionIdentity(window.localStorage);

      if (identity.kind === 'unknown') {
        if (existingQueue) return existingQueue;
        if (!rememberedIdentity) return null;
        const restoredQueue = new DurableSyncQueue(
          createBrowserSyncQueueStorage(rememberedIdentity.userId),
          {
            sessionEpoch: rememberedIdentity.sessionEpoch,
            userId: rememberedIdentity.userId,
          },
        );
        queueRef.current = restoredQueue;
        return restoredQueue;
      }

      if (identity.kind === 'signed-out') {
        await existingQueue?.clear().catch(() => undefined);
        if (!existingQueue && rememberedIdentity) {
          await createBrowserSyncQueueStorage(rememberedIdentity.userId)
            .clear()
            .catch(() => undefined);
        }
        forgetRememberedSessionIdentity(window.localStorage);
        clearWebSyncSessionEpochs();
        queueRef.current = null;
        setBlockedCount(0);
        setPendingCount(0);
        return null;
      }

      if (
        existingQueue?.getNamespace().userId === identity.userId &&
        existingQueue.getNamespace().sessionEpoch === identity.sessionEpoch
      ) {
        rememberSessionIdentity(window.localStorage, identity);
        return existingQueue;
      }

      await existingQueue?.clear().catch(() => undefined);
      if (
        !existingQueue &&
        rememberedIdentity &&
        (rememberedIdentity.userId !== identity.userId ||
          rememberedIdentity.sessionEpoch !== identity.sessionEpoch)
      ) {
        await createBrowserSyncQueueStorage(rememberedIdentity.userId)
          .clear()
          .catch(() => undefined);
      }
      if (
        existingQueue ||
        (rememberedIdentity &&
          (rememberedIdentity.userId !== identity.userId ||
            rememberedIdentity.sessionEpoch !== identity.sessionEpoch))
      ) {
        clearWebSyncSessionEpochs();
      }
      rememberSessionIdentity(window.localStorage, identity);
      const nextQueue = new DurableSyncQueue(createBrowserSyncQueueStorage(identity.userId), {
        sessionEpoch: identity.sessionEpoch,
        userId: identity.userId,
      });
      queueRef.current = nextQueue;
      setBlockedCount(0);
      setPendingCount(0);
      return nextQueue;
    },
    [],
  );

  const syncNow = useCallback(async () => {
    const identity = await readBrowserSessionIdentity();
    if (identity.kind === 'unknown') return;
    const queue = await ensureCurrentQueue(identity);
    if (!queue) return;
    await queue.drain(async (mutation) => {
      const result = await sendMutation(mutation);
      return result === 'completed'
        ? { kind: 'completed' }
        : result === 'blocked'
          ? { kind: 'blocked', reason: 'request was rejected' }
          : { kind: 'retry', reason: 'network or server unavailable' };
    });
    await refreshPendingCount();
  }, [ensureCurrentQueue, refreshPendingCount]);

  useEffect(() => {
    let active = true;
    const initialization = window.setTimeout(() => {
      void ensureCurrentQueue().then(async (queue) => {
        if (!active || !queue) return;
        await refreshPendingCount();
        await syncNow();
        await scheduleBackgroundSync().catch(() => undefined);
      });
    }, 0);
    const onOnline = () => void syncNow();
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void syncNow();
    };
    const unsubscribeInvalidation = subscribeToWebSessionInvalidation(() => {
      const queue = queueRef.current;
      queueRef.current = null;
      setBlockedCount(0);
      setPendingCount(0);
      forgetRememberedSessionIdentity(window.localStorage);
      clearWebSyncSessionEpochs();
      void queue?.clear().catch(() => undefined);
    });
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      active = false;
      window.clearTimeout(initialization);
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      unsubscribeInvalidation();
    };
  }, [ensureCurrentQueue, refreshPendingCount, syncNow]);

  const enqueue = useCallback(
    async (kind: SyncMutationKind, idempotencyKey: string, payload: Record<string, unknown>) => {
      const queue = await ensureCurrentQueue();
      if (!queue) return false;
      await queue.enqueue({ idempotencyKey, kind, operationId: idempotencyKey, payload });
      await refreshPendingCount();
      await scheduleBackgroundSync().catch(() => undefined);
      return true;
    },
    [ensureCurrentQueue, refreshPendingCount],
  );

  const retryBlocked = useCallback(async () => {
    const queue = await ensureCurrentQueue();
    if (!queue) return;
    await queue.retryBlocked();
    await syncNow();
  }, [ensureCurrentQueue, syncNow]);

  const discardBlocked = useCallback(async () => {
    const queue = await ensureCurrentQueue();
    if (!queue) return;
    await queue.discardBlocked();
    await refreshPendingCount();
  }, [ensureCurrentQueue, refreshPendingCount]);

  return (
    <BrowserOfflineSyncContext.Provider
      value={{ blockedCount, discardBlocked, enqueue, pendingCount, retryBlocked, syncNow }}
    >
      {children}
    </BrowserOfflineSyncContext.Provider>
  );
}

export const useBrowserOfflineSync = (): BrowserOfflineSyncState => {
  const context = useContext(BrowserOfflineSyncContext);
  if (!context) {
    throw new Error('useBrowserOfflineSync must be used within BrowserOfflineSyncProvider.');
  }
  return context;
};
