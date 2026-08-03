import type { NativeApiSessionProvider } from '@ideogram/api-client/native';
import type { SyncNamespace } from '@ideogram/contracts';

interface LiveNativeAuthSession {
  accessToken: string;
  userId: string;
}

type ReadLiveNativeAuthSession = () => Promise<LiveNativeAuthSession | null>;

export const createLiveNativeBackgroundSessionProvider =
  (readSession: ReadLiveNativeAuthSession, namespace: SyncNamespace): NativeApiSessionProvider =>
  async () => {
    const session = await readSession();
    if (!session || session.userId !== namespace.userId) return null;
    return {
      accessToken: session.accessToken,
      sessionEpoch: namespace.sessionEpoch,
      userId: namespace.userId,
    };
  };
