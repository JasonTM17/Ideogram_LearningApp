export const createSingleFlightRunner = <T>(run: () => Promise<T>) => {
  let isRunning = false;

  return async (): Promise<T | null> => {
    if (isRunning) return null;
    isRunning = true;
    try {
      return await run();
    } finally {
      isRunning = false;
    }
  };
};
