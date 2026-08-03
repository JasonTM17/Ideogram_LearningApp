import { NativeApiError } from '@ideogram/api-client/native';
import { useCallback, useEffect, useState } from 'react';

import { createMobileNativeLearningApiClient } from '../../lib/api/native-learning-api-client';
import { createSessionBoundRequestSignal } from '../../lib/api/session-bound-request-signal';
import { useNativeAuthSession } from '../auth/native-auth-session-provider';

import type { ReviewQueueResponse } from '@ideogram/contracts';

export type NativeReviewQueueState =
  | { kind: 'waiting' }
  | { kind: 'loading' }
  | { kind: 'ready'; queue: ReviewQueueResponse }
  | { kind: 'error' };

const isExpectedCancellation = (error: unknown): boolean =>
  error instanceof NativeApiError &&
  (error.code === 'ABORTED' ||
    error.code === 'SESSION_CHANGED' ||
    error.code === 'SESSION_REQUIRED');

export const useNativeReviewQueue = () => {
  const { getRequestSignal, hasSession, isHydrating, sessionEpoch, sessionProvider } =
    useNativeAuthSession();
  const [reloadCount, setReloadCount] = useState(0);
  const [state, setState] = useState<NativeReviewQueueState>({ kind: 'waiting' });
  const reload = useCallback(() => setReloadCount((count) => count + 1), []);

  useEffect(() => {
    if (isHydrating || !hasSession || sessionEpoch === null) {
      setState({ kind: 'waiting' });
      return;
    }

    let isCurrent = true;
    const request = createSessionBoundRequestSignal(getRequestSignal());
    setState({ kind: 'loading' });
    void createMobileNativeLearningApiClient(sessionProvider)
      .getLearnerReviewQueue({ signal: request.signal })
      .then((queue) => {
        if (isCurrent) setState({ kind: 'ready', queue });
      })
      .catch((error: unknown) => {
        if (isCurrent && !isExpectedCancellation(error)) setState({ kind: 'error' });
      })
      .finally(request.dispose);

    return () => {
      isCurrent = false;
      request.dispose();
    };
  }, [getRequestSignal, hasSession, isHydrating, reloadCount, sessionEpoch, sessionProvider]);

  return { reload, state };
};
