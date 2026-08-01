import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import {
  bindNativeSessionStore,
  getNativeSupabaseClient,
  NativeSessionStore,
  NativeSessionRequestScope,
  startExpoAuthRefreshLifecycle,
} from '../../lib/supabase';

import type { NativeSessionSnapshot } from '../../lib/supabase';

export interface NativeAuthSessionState {
  getRequestSignal: () => AbortSignal;
  sessionProvider: () => Promise<Readonly<NativeSessionSnapshot> | null>;
  hasSession: boolean;
  isHydrating: boolean;
  sessionEpoch: number | null;
}

type NativeAuthSessionLifecycleState = Pick<
  NativeAuthSessionState,
  'hasSession' | 'isHydrating' | 'sessionEpoch'
>;

const webPreviewState: NativeAuthSessionLifecycleState = {
  hasSession: false,
  isHydrating: false,
  sessionEpoch: null,
};

export const useManagedNativeAuthSession = (): NativeAuthSessionState => {
  const [sessionStore] = useState(() => new NativeSessionStore());
  const [inactiveSignal] = useState(() => {
    const controller = new AbortController();
    controller.abort();
    return controller.signal;
  });
  const [requestScope, setRequestScope] = useState<NativeSessionRequestScope | null>(null);
  const [state, setState] = useState<NativeAuthSessionLifecycleState>(() =>
    Platform.OS === 'web'
      ? webPreviewState
      : { hasSession: false, isHydrating: true, sessionEpoch: null },
  );

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    let isCurrent = true;
    const nextRequestScope = new NativeSessionRequestScope();
    setRequestScope(nextRequestScope);
    let disposeRefreshLifecycle: (() => Promise<void>) | undefined;
    let unsubscribe: (() => void) | undefined;
    let unbindSessionStore: (() => void) | undefined;

    try {
      const client = getNativeSupabaseClient();
      const syncSnapshot = () => {
        if (isCurrent && sessionStore.isInitialized()) {
          const session = sessionStore.getSnapshot();
          nextRequestScope.update(session);
          setState({
            hasSession: session !== null,
            isHydrating: false,
            sessionEpoch: session?.sessionEpoch ?? null,
          });
        }
      };

      unsubscribe = sessionStore.subscribe(syncSnapshot);
      unbindSessionStore = bindNativeSessionStore(client.auth, sessionStore);
      const refreshLifecycle = startExpoAuthRefreshLifecycle(client);
      disposeRefreshLifecycle = () => refreshLifecycle.dispose();
      void client.auth
        .getSession()
        .then(({ data, error }) => {
          if (!isCurrent || error) {
            if (isCurrent && error) {
              setState({ hasSession: false, isHydrating: false, sessionEpoch: null });
            }
            return;
          }

          sessionStore.applySession(data.session);
        })
        .catch(() => {
          if (isCurrent) {
            setState({ hasSession: false, isHydrating: false, sessionEpoch: null });
          }
        });
    } catch {
      nextRequestScope.update(null);
      setState({ hasSession: false, isHydrating: false, sessionEpoch: null });
    }

    return () => {
      isCurrent = false;
      unsubscribe?.();
      unbindSessionStore?.();
      void disposeRefreshLifecycle?.().catch(() => undefined);
      nextRequestScope.dispose();
    };
  }, [sessionStore]);

  const getRequestSignal = useCallback(
    () => requestScope?.getSignal() ?? inactiveSignal,
    [inactiveSignal, requestScope],
  );
  const sessionProvider = useMemo(() => sessionStore.createSessionProvider(), [sessionStore]);

  return useMemo(
    () => ({ ...state, getRequestSignal, sessionProvider }),
    [getRequestSignal, sessionProvider, state],
  );
};
