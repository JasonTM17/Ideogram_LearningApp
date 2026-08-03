import type { SyncNamespace } from '@ideogram/contracts';

const identityOf = (namespace: SyncNamespace | null) =>
  namespace ? `${namespace.userId}:${namespace.sessionEpoch}` : null;

let currentIdentity: string | null = null;
let currentController = new AbortController();

export const updateNativeOfflineSyncRequestNamespace = (
  namespace: SyncNamespace | null,
): AbortSignal => {
  const nextIdentity = identityOf(namespace);
  if (nextIdentity !== currentIdentity) {
    currentController.abort();
    currentController = new AbortController();
    currentIdentity = nextIdentity;
  }
  return currentController.signal;
};

export const invalidateNativeOfflineSyncRequests = (): void => {
  currentController.abort();
  currentController = new AbortController();
  currentIdentity = null;
};
