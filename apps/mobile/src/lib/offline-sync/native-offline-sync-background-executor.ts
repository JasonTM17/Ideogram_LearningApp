import { NativeApiSessionChangedError } from '@ideogram/api-client/native';

import type { NativeApiSessionProvider } from '@ideogram/api-client/native';
import type { SyncNamespace } from '@ideogram/contracts';
import type { DurableSyncQueue } from '@ideogram/sync';

interface QueuedBackgroundSync {
  namespace: SyncNamespace;
  queue: DurableSyncQueue;
}

interface NativeBackgroundSyncDependencies {
  clearQueue: (expectedNamespace: SyncNamespace) => Promise<unknown>;
  createSessionProvider: (
    userId: string,
    sessionEpoch: number,
  ) => Promise<NativeApiSessionProvider>;
  drainQueue: (
    queue: DurableSyncQueue,
    sessionProvider: NativeApiSessionProvider,
    namespace: SyncNamespace,
  ) => Promise<{ blocked: number; completed: number; retried: number }>;
  readCurrentNamespace: () => Promise<SyncNamespace | null>;
  readQueuedSync: () => Promise<QueuedBackgroundSync | null>;
}

export type NativeBackgroundSyncOutcome = 'failed' | 'success';

export const executeNativeOfflineSyncBackgroundTask = async (
  dependencies: NativeBackgroundSyncDependencies,
): Promise<NativeBackgroundSyncOutcome> => {
  try {
    const queued = await dependencies.readQueuedSync();
    if (!queued) return 'success';

    const namespaceMatches = async () => {
      const currentNamespace = await dependencies.readCurrentNamespace();
      return (
        currentNamespace?.userId === queued.namespace.userId &&
        currentNamespace.sessionEpoch === queued.namespace.sessionEpoch
      );
    };
    if (!(await namespaceMatches())) {
      await dependencies.clearQueue(queued.namespace);
      return 'success';
    }

    const sessionProvider = await dependencies.createSessionProvider(
      queued.namespace.userId,
      queued.namespace.sessionEpoch,
    );
    if (!(await namespaceMatches())) {
      await dependencies.clearQueue(queued.namespace);
      return 'success';
    }
    if (!(await sessionProvider())) return 'success';

    const guardedSessionProvider: NativeApiSessionProvider = async () => {
      if (!(await namespaceMatches())) throw new NativeApiSessionChangedError();
      return sessionProvider();
    };

    const result = await dependencies.drainQueue(
      queued.queue,
      guardedSessionProvider,
      queued.namespace,
    );
    return result.retried > 0 ? 'failed' : 'success';
  } catch {
    return 'failed';
  }
};
