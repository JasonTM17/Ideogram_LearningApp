const pendingLocks = new Map<string, Promise<void>>();

const withInMemoryLock = async <T>(name: string, operation: () => Promise<T>): Promise<T> => {
  const previous = pendingLocks.get(name) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  pendingLocks.set(name, current);
  await previous;
  try {
    return await operation();
  } finally {
    release();
    if (pendingLocks.get(name) === current) pendingLocks.delete(name);
  }
};

export const withBrowserExclusiveLock = async <T>(
  name: string,
  operation: () => Promise<T>,
): Promise<T> => {
  const locks = typeof navigator === 'undefined' ? undefined : navigator.locks;
  return locks
    ? locks.request(name, { mode: 'exclusive' }, operation)
    : withInMemoryLock(name, operation);
};
