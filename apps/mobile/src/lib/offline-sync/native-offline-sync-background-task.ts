import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import { syncQueueSnapshotSchema } from '@ideogram/contracts';
import { DurableSyncQueue } from '@ideogram/sync';

import { getNativeSupabaseClient } from '../supabase/native-supabase-client';
import { drainNativeOfflineSyncQueue } from './native-offline-sync-drain';
import {
  createExpoSecureSyncStorage,
  readNativeOfflineSyncSessionNamespace,
} from './expo-secure-sync-storage';

import type { NativeApiSessionProvider } from '@ideogram/api-client/native';

export const NATIVE_OFFLINE_SYNC_BACKGROUND_TASK = 'ideogram-learning.native-offline-sync.v1';
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

const readBackgroundQueue = async () => {
  const storage = createExpoSecureSyncStorage();
  const raw = await storage.read();
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    await storage.clear();
    return null;
  }
  const snapshot = syncQueueSnapshotSchema.safeParse(parsed);
  if (!snapshot.success) {
    await storage.clear();
    return null;
  }
  if (snapshot.data.mutations.length === 0) return null;
  return {
    queue: new DurableSyncQueue(storage, snapshot.data.namespace),
    namespace: snapshot.data.namespace,
  };
};

const createBackgroundSessionProvider = async (
  userId: string,
  sessionEpoch: number,
): Promise<NativeApiSessionProvider> => {
  const { data, error } = await getNativeSupabaseClient().auth.getSession();
  const accessToken = data.session?.access_token;
  const sessionUserId = data.session?.user.id?.toLowerCase();
  if (
    error ||
    typeof accessToken !== 'string' ||
    accessToken.length === 0 ||
    typeof sessionUserId !== 'string' ||
    !uuidPattern.test(sessionUserId) ||
    sessionUserId !== userId
  ) {
    return async () => null;
  }
  return async () => ({ accessToken, sessionEpoch, userId });
};

export const runNativeOfflineSyncBackgroundTask =
  async (): Promise<BackgroundTask.BackgroundTaskResult> => {
    try {
      const queued = await readBackgroundQueue();
      if (!queued) return BackgroundTask.BackgroundTaskResult.Success;
      const currentNamespace = await readNativeOfflineSyncSessionNamespace();
      if (
        !currentNamespace ||
        currentNamespace.userId !== queued.namespace.userId ||
        currentNamespace.sessionEpoch !== queued.namespace.sessionEpoch
      ) {
        await createExpoSecureSyncStorage().clear();
        return BackgroundTask.BackgroundTaskResult.Success;
      }
      const sessionProvider = await createBackgroundSessionProvider(
        queued.namespace.userId,
        queued.namespace.sessionEpoch,
      );
      if (!(await sessionProvider())) return BackgroundTask.BackgroundTaskResult.Success;
      const result = await drainNativeOfflineSyncQueue(queued.queue, sessionProvider, 5);
      return result.retried > 0
        ? BackgroundTask.BackgroundTaskResult.Failed
        : BackgroundTask.BackgroundTaskResult.Success;
    } catch {
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  };

if (!TaskManager.isTaskDefined(NATIVE_OFFLINE_SYNC_BACKGROUND_TASK)) {
  TaskManager.defineTask(NATIVE_OFFLINE_SYNC_BACKGROUND_TASK, runNativeOfflineSyncBackgroundTask);
}

export const registerNativeOfflineSyncBackgroundTask = async (): Promise<boolean> => {
  if (Platform.OS === 'web') return false;
  const status = await BackgroundTask.getStatusAsync();
  if (status !== BackgroundTask.BackgroundTaskStatus.Available) return false;
  if (!(await TaskManager.isTaskRegisteredAsync(NATIVE_OFFLINE_SYNC_BACKGROUND_TASK))) {
    await BackgroundTask.registerTaskAsync(NATIVE_OFFLINE_SYNC_BACKGROUND_TASK, {
      minimumInterval: 15,
    });
  }
  return true;
};

export const unregisterNativeOfflineSyncBackgroundTask = async (): Promise<void> => {
  if (
    Platform.OS !== 'web' &&
    (await TaskManager.isTaskRegisteredAsync(NATIVE_OFFLINE_SYNC_BACKGROUND_TASK))
  ) {
    await BackgroundTask.unregisterTaskAsync(NATIVE_OFFLINE_SYNC_BACKGROUND_TASK);
  }
};
