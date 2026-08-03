import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import { getNativeSupabaseClient } from '../supabase/native-supabase-client';
import { drainNativeOfflineSyncQueue } from './native-offline-sync-drain';
import { executeNativeOfflineSyncBackgroundTask } from './native-offline-sync-background-executor';
import { createLiveNativeBackgroundSessionProvider } from './live-native-background-session-provider';
import { readNativeOfflineSyncQueue } from './native-offline-sync-queue-reader';
import { updateNativeOfflineSyncRequestNamespace } from './native-offline-sync-session-signal';
import {
  clearNativeOfflineSyncQueueIfOwnedBy,
  createExpoSecureSyncStorage,
  readNativeOfflineSyncSessionNamespace,
} from './expo-secure-sync-storage';

import type { NativeApiSessionProvider } from '@ideogram/api-client/native';

export const NATIVE_OFFLINE_SYNC_BACKGROUND_TASK = 'ideogram-learning.native-offline-sync.v1';
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

const readBackgroundQueue = async () => {
  const namespace = await readNativeOfflineSyncSessionNamespace();
  if (!namespace) return null;
  return readNativeOfflineSyncQueue(createExpoSecureSyncStorage(namespace), namespace);
};

const createBackgroundSessionProvider = async (
  userId: string,
  sessionEpoch: number,
): Promise<NativeApiSessionProvider> =>
  createLiveNativeBackgroundSessionProvider(
    async () => {
      const { data, error } = await getNativeSupabaseClient().auth.getSession();
      if (error) throw error;
      const accessToken = data.session?.access_token;
      const sessionUserId = data.session?.user.id?.toLowerCase();
      if (
        typeof accessToken !== 'string' ||
        accessToken.length === 0 ||
        typeof sessionUserId !== 'string' ||
        !uuidPattern.test(sessionUserId)
      ) {
        return null;
      }
      return { accessToken, userId: sessionUserId };
    },
    { sessionEpoch, userId },
  );

export const runNativeOfflineSyncBackgroundTask =
  async (): Promise<BackgroundTask.BackgroundTaskResult> => {
    return (await executeNativeOfflineSyncBackgroundTask({
      clearQueue: clearNativeOfflineSyncQueueIfOwnedBy,
      createSessionProvider: createBackgroundSessionProvider,
      drainQueue: (queue, sessionProvider, namespace) =>
        drainNativeOfflineSyncQueue(
          queue,
          sessionProvider,
          5,
          updateNativeOfflineSyncRequestNamespace(namespace),
        ),
      readCurrentNamespace: readNativeOfflineSyncSessionNamespace,
      readQueuedSync: readBackgroundQueue,
    })) === 'success'
      ? BackgroundTask.BackgroundTaskResult.Success
      : BackgroundTask.BackgroundTaskResult.Failed;
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
