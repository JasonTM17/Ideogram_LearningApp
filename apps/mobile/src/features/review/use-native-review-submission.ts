import * as Crypto from 'expo-crypto';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityAttemptLifecycle } from '@ideogram/api-client';
import { NativeApiCallerAbortError } from '@ideogram/api-client/native';

import { createSessionBoundRequestSignal } from '../../lib/api/session-bound-request-signal';
import { createMobileNativeLearningApiClient } from '../../lib/api/native-learning-api-client';
import { createActivityOperationUuid } from '../../lib/activity-operation';
import { useNativeOfflineSync } from '../offline-sync/native-offline-sync-provider';
import { resolveNativeClientTimeZone } from '../lesson/vocabulary-activity-state';
import {
  createNativeReviewSubmissionInput,
  describeNativeReviewError,
  type NativeReviewErrorFeedback,
} from './native-review-state';

import type { ActivityOperationIdentityStore } from '@ideogram/api-client';
import type {
  ReviewGrade,
  ReviewSubmissionInput,
  ReviewSubmissionReceipt,
} from '@ideogram/contracts';
import type { NativeVocabularyReviewItem } from './review-queue-presentation';
import type { useNativeAuthSession } from '../auth/native-auth-session-provider';

export type NativeReviewSubmissionState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { feedback: NativeReviewErrorFeedback; kind: 'error' }
  | { item: NativeVocabularyReviewItem; kind: 'receipt'; receipt: ReviewSubmissionReceipt };

interface UseNativeReviewSubmissionOptions {
  auth: ReturnType<typeof useNativeAuthSession>;
  identityStore: ActivityOperationIdentityStore;
  onReceipt: (itemId: string) => void;
}

const abortedFeedback = describeNativeReviewError(new NativeApiCallerAbortError());

export const useNativeReviewSubmission = ({
  auth,
  identityStore,
  onReceipt,
}: UseNativeReviewSubmissionOptions) => {
  const offlineSync = useNativeOfflineSync();
  const [state, setState] = useState<NativeReviewSubmissionState>({ kind: 'idle' });
  const lifecycle =
    useRef<
      ActivityAttemptLifecycle<
        ReviewSubmissionInput,
        ReviewSubmissionReceipt,
        NativeReviewErrorFeedback
      >
    >(null);

  useEffect(() => () => lifecycle.current?.dispose(), []);

  const submitGrade = useCallback(
    async (item: NativeVocabularyReviewItem | null, grade?: ReviewGrade) => {
      if (!item || lifecycle.current?.isSubmitting || !auth.hasSession) return;
      let requestLifecycle = lifecycle.current;
      if (!requestLifecycle) {
        if (!grade) return;
        requestLifecycle = new ActivityAttemptLifecycle({
          createInput: async () =>
            createNativeReviewSubmissionInput({
              createIdempotencyKey: () => createActivityOperationUuid(Crypto.randomUUID),
              grade,
              identity: await identityStore.reserve(),
              itemId: item.itemId,
              now: new Date(),
              timezone: resolveNativeClientTimeZone(),
            }),
          createRequestScope: () => createSessionBoundRequestSignal(auth.getRequestSignal()),
          describeError: describeNativeReviewError,
          isRetryable: (feedback) => feedback.retryable,
          submit: (input, options) =>
            createMobileNativeLearningApiClient(auth.sessionProvider).submitReview(input, options),
        });
        lifecycle.current = requestLifecycle;
      }

      setState({ kind: 'submitting' });
      const result = await requestLifecycle.submit();
      if (result.kind === 'receipt') {
        lifecycle.current?.dispose();
        lifecycle.current = null;
        onReceipt(item.itemId);
        setState({ item, kind: 'receipt', receipt: result.receipt });
      } else if (result.kind === 'error') {
        const pendingInput = lifecycle.current?.getPendingInput();
        const queued =
          result.feedback.retryable && pendingInput
            ? await offlineSync.enqueue('review', pendingInput.idempotencyKey, pendingInput)
            : false;
        if (queued) lifecycle.current?.discardPendingInput();
        setState({
          feedback: queued
            ? {
                ...result.feedback,
                message: 'Đã lưu quyết định này trên thiết bị và sẽ đồng bộ khi có mạng.',
              }
            : result.feedback,
          kind: 'error',
        });
      } else if (result.kind === 'aborted') {
        setState({ feedback: abortedFeedback, kind: 'error' });
      }
    },
    [auth, identityStore, offlineSync, onReceipt],
  );

  return {
    reset: () => setState({ kind: 'idle' }),
    state,
    stop: () => lifecycle.current?.stop(),
    submitGrade,
  };
};
