import { NativeApiCallerAbortError, NativeApiTimeoutError } from './native-api-errors';

type NativeApiAbortError = NativeApiCallerAbortError | NativeApiTimeoutError;

export interface NativeApiAbortScope {
  dispose: () => void;
  run: <T>(operation: () => Promise<T>) => Promise<T>;
  signal: AbortSignal;
  throwIfAborted: () => void;
}

export const createNativeApiAbortScope = (
  callerSignal: AbortSignal | undefined,
  timeoutMs: number,
): NativeApiAbortScope => {
  const controller = new AbortController();
  let abortError: NativeApiAbortError | null = null;

  const abort = (error: NativeApiAbortError): void => {
    if (abortError !== null) return;
    abortError = error;
    controller.abort();
  };

  const handleCallerAbort = (): void => {
    abort(new NativeApiCallerAbortError());
  };

  if (callerSignal?.aborted) {
    handleCallerAbort();
  } else {
    callerSignal?.addEventListener('abort', handleCallerAbort, { once: true });
  }

  const timeout = setTimeout(() => {
    abort(new NativeApiTimeoutError());
  }, timeoutMs);

  const throwIfAborted = (): void => {
    if (abortError !== null) throw abortError;
  };

  const run = <T>(operation: () => Promise<T>): Promise<T> => {
    throwIfAborted();

    return new Promise<T>((resolve, reject) => {
      const handleAbort = (): void => {
        controller.signal.removeEventListener('abort', handleAbort);
        reject(abortError ?? new NativeApiTimeoutError());
      };

      controller.signal.addEventListener('abort', handleAbort, { once: true });
      if (controller.signal.aborted) {
        handleAbort();
        return;
      }

      Promise.resolve()
        .then(() => {
          throwIfAborted();
          return operation();
        })
        .then(
          (value) => {
            controller.signal.removeEventListener('abort', handleAbort);
            resolve(value);
          },
          (error: unknown) => {
            controller.signal.removeEventListener('abort', handleAbort);
            reject(error);
          },
        );
    });
  };

  return {
    dispose: () => {
      clearTimeout(timeout);
      callerSignal?.removeEventListener('abort', handleCallerAbort);
    },
    run,
    signal: controller.signal,
    throwIfAborted,
  };
};
