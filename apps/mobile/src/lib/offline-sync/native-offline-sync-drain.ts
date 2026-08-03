import { NativeApiError } from '@ideogram/api-client/native';

import { createMobileNativeLearningApiClient } from '../api/native-learning-api-client';

import type { NativeApiSessionProvider } from '@ideogram/api-client/native';
import type { DurableSyncQueue, SyncMutationHandler } from '@ideogram/sync';

const retryableCodes = new Set([
  'INVALID_RESPONSE',
  'NETWORK_ERROR',
  'RATE_LIMITED',
  'SERVER_ERROR',
  'TIMEOUT',
]);

const createMutationHandler = (sessionProvider: NativeApiSessionProvider): SyncMutationHandler => {
  const client = createMobileNativeLearningApiClient(sessionProvider);
  return async (mutation) => {
    try {
      if (mutation.kind === 'activity') await client.submitActivityAttempt(mutation.payload);
      if (mutation.kind === 'review') await client.submitReview(mutation.payload);
      if (mutation.kind === 'placement-answer') {
        const sessionId = mutation.payload.placementSessionId;
        const input = mutation.payload.input;
        if (typeof sessionId !== 'string' || !input || typeof input !== 'object') {
          return { kind: 'blocked', reason: 'invalid placement payload' };
        }
        await client.submitPlacementAnswer(sessionId, input);
      }
      if (mutation.kind === 'placement-submit') {
        const sessionId = mutation.payload.placementSessionId;
        if (typeof sessionId !== 'string') {
          return { kind: 'blocked', reason: 'invalid placement submit payload' };
        }
        await client.submitPlacementSession({ placementSessionId: sessionId });
      }
      return { kind: 'completed' };
    } catch (error) {
      return error instanceof NativeApiError && retryableCodes.has(error.code)
        ? { kind: 'retry', reason: error.code }
        : { kind: 'blocked', reason: error instanceof NativeApiError ? error.code : 'unknown' };
    }
  };
};

export const drainNativeOfflineSyncQueue = (
  queue: DurableSyncQueue,
  sessionProvider: NativeApiSessionProvider,
  maxMutations?: number,
) =>
  queue.drain(
    createMutationHandler(sessionProvider),
    maxMutations === undefined ? undefined : { maxMutations },
  );
