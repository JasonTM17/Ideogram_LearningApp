import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import {
  bindNativeSessionStore,
  getNativeSupabaseClient,
  NativeSessionStore,
  startExpoAuthRefreshLifecycle,
} from '../../lib/supabase';

export interface NativeAuthSessionState {
  hasSession: boolean;
  isHydrating: boolean;
}

const webPreviewState: NativeAuthSessionState = {
  hasSession: false,
  isHydrating: false,
};

export const useNativeAuthSession = (): NativeAuthSessionState => {
  const [state, setState] = useState<NativeAuthSessionState>(() =>
    Platform.OS === 'web' ? webPreviewState : { hasSession: false, isHydrating: true },
  );

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    let isCurrent = true;
    let disposeRefreshLifecycle: (() => Promise<void>) | undefined;
    let unsubscribe: (() => void) | undefined;
    let unbindSessionStore: (() => void) | undefined;

    try {
      const client = getNativeSupabaseClient();
      const sessionStore = new NativeSessionStore();
      const syncSnapshot = () => {
        if (isCurrent && sessionStore.isInitialized()) {
          setState({ hasSession: sessionStore.getSnapshot() !== null, isHydrating: false });
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
              setState({ hasSession: false, isHydrating: false });
            }
            return;
          }

          sessionStore.applySession(data.session);
        })
        .catch(() => {
          if (isCurrent) {
            setState({ hasSession: false, isHydrating: false });
          }
        });
    } catch {
      setState({ hasSession: false, isHydrating: false });
    }

    return () => {
      isCurrent = false;
      unsubscribe?.();
      unbindSessionStore?.();
      void disposeRefreshLifecycle?.().catch(() => undefined);
    };
  }, []);

  return state;
};
