import { NativeApiError } from '@ideogram/api-client/native';

import { createMobileNativeLearningApiClient } from '../api/native-learning-api-client';

import type { NativeApiSessionProvider } from '@ideogram/api-client/native';
import type { DurableSyncQueue, SyncMutationHandler } from '@ideogram/sync';

const retryableCodes = new Set([
  'ABORTED',
  'INVALID_RESPONSE',
  'NETWORK_ERROR',
  'RATE_LIMITED',
  'SERVER_ERROR',
  'SESSION_CHANGED',
  'SESSION_PROVIDER_ERROR',
  'SESSION_REQUIRED',
  'TIMEOUT',
]);

export const isRetryableNativeOfflineSyncError = (error: unknown): error is NativeApiError =>
  error instanceof NativeApiError && retryableCodes.has(error.code);

const createMutationHandler = (
  sessionProvider: NativeApiSessionProvider,
  signal?: AbortSignal,
): SyncMutationHandler => {
  const client = createMobileNativeLearningApiClient(sessionProvider);
  const requestOptions = signal ? { signal } : undefined;
  return async (mutation) => {
    try {
      if (mutation.kind === 'activity')
        await client.submitActivityAttempt(mutation.payload, requestOptions);
      if (mutation.kind === 'review') await client.submitReview(mutation.payload, requestOptions);
      if (mutation.kind === 'placement-answer') {
        const sessionId = mutation.payload.placementSessionId;
        const input = mutation.payload.input;
        if (typeof sessionId !== 'string' || !input || typeof input !== 'object') {
          return { kind: 'blocked', reason: 'invalid placement payload' };
        }
        await client.submitPlacementAnswer(sessionId, input, requestOptions);
      }
      if (mutation.kind === 'placement-submit') {
        const sessionId = mutation.payload.placementSessionId;
        if (typeof sessionId !== 'string') {
          return { kind: 'blocked', reason: 'invalid placement submit payload' };
        }
        await client.submitPlacementSession({ placementSessionId: sessionId }, requestOptions);
      }
      return { kind: 'completed' };
    } catch (error) {
      return isRetryableNativeOfflineSyncError(error)
        ? { kind: 'retry', reason: error.code }
        : { kind: 'blocked', reason: error instanceof NativeApiError ? error.code : 'unknown' };
    }
  };
};

export const drainNativeOfflineSyncQueue = (
  queue: DurableSyncQueue,
  sessionProvider: NativeApiSessionProvider,
  maxMutations?: number,
  signal?: AbortSignal,
) =>
  queue.drain(
    createMutationHandler(sessionProvider, signal),
    maxMutations === undefined ? undefined : { maxMutations },
  );
