import { NativeApiError } from '@ideogram/api-client/native';
import { useCallback, useEffect, useState } from 'react';

import { createMobileNativeLearningApiClient } from '../../lib/api/native-learning-api-client';
import { useNativeAuthSession } from '../auth/native-auth-session-provider';
import { findFirstCatalogLesson, type CatalogLessonContext } from './catalog-lesson-context';

import type { LearnerCatalogResponse } from '@ideogram/contracts';

export type { CatalogLessonContext } from './catalog-lesson-context';

export type NativeLearnerCatalogState =
  | { kind: 'waiting' }
  | { kind: 'loading' }
  | { catalog: LearnerCatalogResponse; kind: 'ready'; nextLesson: CatalogLessonContext | null }
  | { kind: 'error' };

const isExpectedCancellation = (error: unknown): boolean =>
  error instanceof NativeApiError &&
  (error.code === 'ABORTED' ||
    error.code === 'SESSION_CHANGED' ||
    error.code === 'SESSION_REQUIRED');

export const useManagedNativeLearnerCatalog = () => {
  const { getRequestSignal, hasSession, isHydrating, sessionEpoch, sessionProvider } =
    useNativeAuthSession();
  const [reloadCount, setReloadCount] = useState(0);
  const [state, setState] = useState<NativeLearnerCatalogState>({ kind: 'waiting' });
  const reload = useCallback(() => setReloadCount((count) => count + 1), []);

  useEffect(() => {
    if (isHydrating || !hasSession || sessionEpoch === null) {
      setState({ kind: 'waiting' });
      return;
    }

    let isCurrent = true;
    setState({ kind: 'loading' });

    try {
      const client = createMobileNativeLearningApiClient(sessionProvider);
      const signal = getRequestSignal();

      void client
        .getLearnerCatalog({ signal })
        .then((catalog) => {
          if (isCurrent) {
            setState({ catalog, kind: 'ready', nextLesson: findFirstCatalogLesson(catalog) });
          }
        })
        .catch((error: unknown) => {
          if (isCurrent && !isExpectedCancellation(error)) {
            setState({ kind: 'error' });
          }
        });
    } catch {
      setState({ kind: 'error' });
    }

    return () => {
      isCurrent = false;
    };
  }, [getRequestSignal, hasSession, isHydrating, reloadCount, sessionEpoch, sessionProvider]);

  return { reload, state };
};
