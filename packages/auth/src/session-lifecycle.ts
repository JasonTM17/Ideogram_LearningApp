import { getAuthSessionStatus } from '@ideogram/contracts';

import type { AuthSessionBoundary, AuthSessionStatus } from '@ideogram/contracts';

export interface RemoteSignOutPort {
  signOut: () => Promise<void>;
}

export interface SessionStoragePort {
  clear: () => Promise<void>;
}

export const getRefreshDecision = (
  session: AuthSessionBoundary,
  now = new Date(),
): AuthSessionStatus => getAuthSessionStatus(session, now);

/**
 * Local credential cleanup happens even if the remote revocation request fails.
 * The caller receives the remote failure after cleanup and can show recovery UI.
 */
export const signOutAndClearLocalSession = async ({
  remoteSignOut,
  sessionStorage,
}: {
  remoteSignOut: RemoteSignOutPort;
  sessionStorage: SessionStoragePort;
}): Promise<void> => {
  const remoteSignOutPromise = Promise.resolve().then(() => remoteSignOut.signOut());

  try {
    await sessionStorage.clear();
  } catch (error) {
    void remoteSignOutPromise.catch(() => undefined);
    throw error;
  }

  await remoteSignOutPromise;
};
