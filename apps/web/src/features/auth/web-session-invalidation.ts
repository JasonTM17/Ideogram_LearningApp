const webSessionInvalidationStorageKey = 'ideogram-learning:web-session-invalidated:v1';

type StorageInvalidationListener = () => void;

/**
 * Notifies other same-origin tabs after a successful local sign-out. The server
 * still owns the session boundary; this only prevents stale client UI while a
 * tab is waiting for an in-flight request to settle.
 */
export const broadcastWebSessionInvalidation = (): void => {
  try {
    window.localStorage.setItem(
      webSessionInvalidationStorageKey,
      `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
  } catch {
    // A completed sign-out must not be reported as failed because storage is blocked.
  }
};

export const subscribeToWebSessionInvalidation = (
  onInvalidate: StorageInvalidationListener,
): (() => void) => {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const handleStorageEvent = (event: StorageEvent) => {
    if (event.key === webSessionInvalidationStorageKey) {
      onInvalidate();
    }
  };

  window.addEventListener('storage', handleStorageEvent);
  return () => window.removeEventListener('storage', handleStorageEvent);
};
