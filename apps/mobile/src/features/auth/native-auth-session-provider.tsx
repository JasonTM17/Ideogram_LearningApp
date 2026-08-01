import { createContext, useContext } from 'react';

import {
  useManagedNativeAuthSession,
  type NativeAuthSessionState,
} from './use-native-auth-session';

import type { ReactNode } from 'react';

const NativeAuthSessionContext = createContext<NativeAuthSessionState | null>(null);

export const NativeAuthSessionProvider = ({ children }: { children: ReactNode }) => {
  const session = useManagedNativeAuthSession();

  return (
    <NativeAuthSessionContext.Provider value={session}>
      {children}
    </NativeAuthSessionContext.Provider>
  );
};

export const useNativeAuthSession = (): NativeAuthSessionState => {
  const session = useContext(NativeAuthSessionContext);

  if (!session) {
    throw new Error('useNativeAuthSession must be used within NativeAuthSessionProvider.');
  }

  return session;
};
