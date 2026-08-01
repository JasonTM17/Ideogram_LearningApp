import { afterEach, describe, expect, it, vi } from 'vitest';

import { NativeApiCallerAbortError, NativeApiTimeoutError } from './native-api-errors';
import { createNativeApiClient } from './native-learning-api-client';

import type { NativeApiFetch } from './native-api-json-request';

const sessionProvider = async () => ({
  accessToken: 'safe-token',
  sessionEpoch: 3,
  userId: 'learner-1',
});

const activityInput = {
  activityId: 'ja-n5-l01-vocabulary',
  contentReleaseId: 'ja-n5-pilot-v1',
  deviceId: '123e4567-e89b-42d3-a456-426614174001',
  deviceSequence: 7,
  idempotencyKey: '123e4567-e89b-42d3-a456-426614174002',
  responsePayload: { acknowledged: true },
  reviewedAtClient: '2026-07-29T00:00:00.000Z',
  timezone: 'Asia/Ho_Chi_Minh',
} as const;

afterEach(() => {
  vi.useRealTimers();
});

describe('native learner catalog cancellation', () => {
  it('aborts an unresponsive fetch at the configured timeout and cleans its timer', async () => {
    vi.useFakeTimers();
    let requestSignal: AbortSignal | undefined;
    const fetchImplementation: NativeApiFetch = async (_url, init) => {
      requestSignal = init.signal;
      return new Promise(() => undefined);
    };
    const client = createNativeApiClient({
      apiOrigin: 'https://api.example.test',
      fetch: fetchImplementation,
      requestTimeoutMs: 50,
      sessionProvider,
    });

    const pendingRequest = client.getLearnerCatalog();
    const timeoutExpectation = expect(pendingRequest).rejects.toBeInstanceOf(NativeApiTimeoutError);
    await vi.advanceTimersByTimeAsync(50);

    await timeoutExpectation;
    expect(requestSignal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('applies the same timeout boundary to activity POST requests', async () => {
    vi.useFakeTimers();
    let requestMethod: string | undefined;
    const fetchImplementation: NativeApiFetch = async (_url, init) => {
      requestMethod = init.method;
      return new Promise(() => undefined);
    };
    const client = createNativeApiClient({
      apiOrigin: 'https://api.example.test',
      fetch: fetchImplementation,
      requestTimeoutMs: 50,
      sessionProvider,
    });

    const pendingRequest = client.submitActivityAttempt(activityInput);
    const timeoutExpectation = expect(pendingRequest).rejects.toBeInstanceOf(NativeApiTimeoutError);
    await vi.advanceTimersByTimeAsync(50);

    await timeoutExpectation;
    expect(requestMethod).toBe('POST');
  });

  it('forwards caller cancellation and removes the caller listener', async () => {
    const controller = new AbortController();
    const removeListener = vi.spyOn(controller.signal, 'removeEventListener');
    let markFetchStarted: (() => void) | undefined;
    const fetchStarted = new Promise<void>((resolve) => {
      markFetchStarted = resolve;
    });
    let requestSignal: AbortSignal | undefined;
    const fetchImplementation: NativeApiFetch = async (_url, init) => {
      requestSignal = init.signal;
      markFetchStarted?.();
      return new Promise(() => undefined);
    };
    const client = createNativeApiClient({
      apiOrigin: 'https://api.example.test',
      fetch: fetchImplementation,
      sessionProvider,
    });

    const pendingRequest = client.getLearnerCatalog({ signal: controller.signal });
    await fetchStarted;
    controller.abort();

    await expect(pendingRequest).rejects.toBeInstanceOf(NativeApiCallerAbortError);
    expect(requestSignal?.aborted).toBe(true);
    expect(removeListener).toHaveBeenCalledWith('abort', expect.any(Function));
  });

  it('forwards caller cancellation for activity POST requests', async () => {
    const controller = new AbortController();
    let markFetchStarted: (() => void) | undefined;
    const fetchStarted = new Promise<void>((resolve) => {
      markFetchStarted = resolve;
    });
    let requestSignal: AbortSignal | undefined;
    const fetchImplementation: NativeApiFetch = async (_url, init) => {
      requestSignal = init.signal;
      markFetchStarted?.();
      return new Promise(() => undefined);
    };
    const client = createNativeApiClient({
      apiOrigin: 'https://api.example.test',
      fetch: fetchImplementation,
      sessionProvider,
    });

    const pendingRequest = client.submitActivityAttempt(activityInput, {
      signal: controller.signal,
    });
    await fetchStarted;
    controller.abort();

    await expect(pendingRequest).rejects.toBeInstanceOf(NativeApiCallerAbortError);
    expect(requestSignal?.aborted).toBe(true);
  });

  it('does not start a fetch for an already-aborted caller signal', async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchImplementation = vi.fn<NativeApiFetch>();
    const client = createNativeApiClient({
      apiOrigin: 'https://api.example.test',
      fetch: fetchImplementation,
      sessionProvider,
    });

    await expect(client.getLearnerCatalog({ signal: controller.signal })).rejects.toBeInstanceOf(
      NativeApiCallerAbortError,
    );
    expect(fetchImplementation).not.toHaveBeenCalled();
  });
});
