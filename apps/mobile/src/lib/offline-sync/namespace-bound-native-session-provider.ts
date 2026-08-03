import { NativeApiSessionChangedError } from '@ideogram/api-client/native';

import type { NativeApiSessionProvider } from '@ideogram/api-client/native';
import type { SyncNamespace } from '@ideogram/contracts';

export const bindNativeSessionProviderToNamespace =
  (sessionProvider: NativeApiSessionProvider, namespace: SyncNamespace): NativeApiSessionProvider =>
  async () => {
    const session = await sessionProvider();
    if (!session) return null;
    if (session.userId !== namespace.userId || session.sessionEpoch !== namespace.sessionEpoch) {
      throw new NativeApiSessionChangedError();
    }
    return session;
  };
