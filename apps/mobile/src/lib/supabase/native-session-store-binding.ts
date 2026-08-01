import type { NativeSessionStore, SupabaseSessionLike } from './native-session-store';

export interface SupabaseAuthStateSubscription {
  unsubscribe: () => void;
}

export interface SupabaseAuthStatePort {
  onAuthStateChange: (callback: (event: string, session: SupabaseSessionLike | null) => void) => {
    data: {
      subscription: SupabaseAuthStateSubscription;
    };
  };
}

export const bindNativeSessionStore = (
  auth: SupabaseAuthStatePort,
  store: NativeSessionStore,
): (() => void) => {
  const {
    data: { subscription },
  } = auth.onAuthStateChange((_event, session) => {
    store.applySession(session);
  });

  return () => {
    subscription.unsubscribe();
  };
};
