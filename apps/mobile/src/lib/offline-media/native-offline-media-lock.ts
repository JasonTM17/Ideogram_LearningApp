const pendingOperations = new Map<string, Promise<void>>();

export const withNativeOfflineMediaLock = async <T>(
  userId: string,
  operation: () => Promise<T>,
): Promise<T> => {
  const previous = pendingOperations.get(userId) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  pendingOperations.set(userId, current);
  await previous;
  try {
    return await operation();
  } finally {
    release();
    if (pendingOperations.get(userId) === current) pendingOperations.delete(userId);
  }
};
