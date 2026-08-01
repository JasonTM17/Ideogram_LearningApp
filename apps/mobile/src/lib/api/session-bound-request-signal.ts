export interface SessionBoundRequestSignal {
  dispose: () => void;
  signal: AbortSignal;
}

export const createSessionBoundRequestSignal = (
  sessionSignal: AbortSignal,
): SessionBoundRequestSignal => {
  const controller = new AbortController();
  const abort = () => controller.abort();

  if (sessionSignal.aborted) {
    abort();
  } else {
    sessionSignal.addEventListener('abort', abort, { once: true });
  }

  return {
    dispose: () => {
      sessionSignal.removeEventListener('abort', abort);
      abort();
    },
    signal: controller.signal,
  };
};
