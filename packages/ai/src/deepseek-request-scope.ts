const MAX_REQUEST_TIMEOUT_MS = 60_000;

export class DeepSeekRequestTimeoutError extends Error {
  constructor() {
    super('The tutor provider request timed out.');
    this.name = 'DeepSeekRequestTimeoutError';
  }
}

export interface DeepSeekRequestScope {
  dispose: () => void;
  signal: AbortSignal;
  throwIfAborted: () => void;
}

export const createDeepSeekRequestScope = (
  callerSignal: AbortSignal | undefined,
  timeoutMs: number,
): DeepSeekRequestScope => {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > MAX_REQUEST_TIMEOUT_MS) {
    throw new TypeError('DeepSeek request timeout is invalid.');
  }

  const controller = new AbortController();
  let timedOut = false;
  const abortFromCaller = () => controller.abort();
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  if (callerSignal?.aborted) {
    abortFromCaller();
  } else {
    callerSignal?.addEventListener('abort', abortFromCaller, { once: true });
  }

  return {
    dispose: () => {
      clearTimeout(timer);
      callerSignal?.removeEventListener('abort', abortFromCaller);
      controller.abort();
    },
    signal: controller.signal,
    throwIfAborted: () => {
      if (timedOut) throw new DeepSeekRequestTimeoutError();
      if (controller.signal.aborted)
        throw new DOMException('The tutor request was cancelled.', 'AbortError');
    },
  };
};
