import { describe, expect, it, vi } from 'vitest';

import { ActivityAttemptLifecycle } from './activity-attempt-lifecycle';

type Feedback = { retryable: boolean };

const createScope = () => {
  const controller = new AbortController();
  return { dispose: () => controller.abort(), signal: controller.signal };
};

const createDeferred = <T>() => {
  let reject!: (error: unknown) => void;
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
};

const createLifecycle = (
  overrides: Partial<
    ConstructorParameters<typeof ActivityAttemptLifecycle<string, string, Feedback>>[0]
  > = {},
) =>
  new ActivityAttemptLifecycle<string, string, Feedback>({
    createInput: async () => 'attempt-1',
    createRequestScope: createScope,
    describeError: (error) => ({ retryable: error instanceof Error && error.message === 'retry' }),
    isRetryable: (feedback) => feedback.retryable,
    submit: async () => 'receipt-1',
    ...overrides,
  });

describe('ActivityAttemptLifecycle', () => {
  it('keeps a duplicate interaction from creating or submitting a second attempt', async () => {
    const deferred = createDeferred<string>();
    const createInput = vi.fn(async () => 'attempt-1');
    const submit = vi.fn(async () => deferred.promise);
    const lifecycle = createLifecycle({ createInput, submit });

    const first = lifecycle.submit();
    await vi.waitFor(() => expect(submit).toHaveBeenCalledTimes(1));

    await expect(lifecycle.submit()).resolves.toEqual({ kind: 'busy' });
    expect(createInput).toHaveBeenCalledTimes(1);

    deferred.resolve('receipt-1');
    await expect(first).resolves.toEqual({ kind: 'receipt', receipt: 'receipt-1' });
  });

  it('replays the exact pending input after a retryable failure', async () => {
    const createInput = vi.fn(async () => 'attempt-1');
    const submit = vi
      .fn()
      .mockRejectedValueOnce(new Error('retry'))
      .mockResolvedValueOnce('receipt-1');
    const lifecycle = createLifecycle({ createInput, submit });

    await expect(lifecycle.submit()).resolves.toEqual({
      feedback: { retryable: true },
      kind: 'error',
    });
    await expect(lifecycle.submit()).resolves.toEqual({ kind: 'receipt', receipt: 'receipt-1' });

    expect(createInput).toHaveBeenCalledTimes(1);
    expect(submit).toHaveBeenNthCalledWith(1, 'attempt-1', expect.any(Object));
    expect(submit).toHaveBeenNthCalledWith(2, 'attempt-1', expect.any(Object));
  });

  it('drops a pending input after a terminal error before the next attempt', async () => {
    const createInput = vi
      .fn()
      .mockResolvedValueOnce('attempt-1')
      .mockResolvedValueOnce('attempt-2');
    const submit = vi
      .fn()
      .mockRejectedValueOnce(new Error('terminal'))
      .mockResolvedValueOnce('receipt-2');
    const lifecycle = createLifecycle({ createInput, submit });

    await expect(lifecycle.submit()).resolves.toEqual({
      feedback: { retryable: false },
      kind: 'error',
    });
    await expect(lifecycle.submit()).resolves.toEqual({ kind: 'receipt', receipt: 'receipt-2' });

    expect(createInput).toHaveBeenCalledTimes(2);
    expect(submit).toHaveBeenNthCalledWith(2, 'attempt-2', expect.any(Object));
  });

  it('does not return a receipt after the active request has been stopped', async () => {
    const deferred = createDeferred<string>();
    const lifecycle = createLifecycle({ submit: async () => deferred.promise });

    const attempt = lifecycle.submit();
    await vi.waitFor(() => expect(lifecycle.isSubmitting).toBe(true));
    expect(lifecycle.stop()).toBe(true);

    deferred.resolve('receipt-1');
    await expect(attempt).resolves.toEqual({ kind: 'aborted' });
    expect(lifecycle.isSubmitting).toBe(false);
  });

  it('does not submit when request-input creation fails before an operation exists', async () => {
    const submit = vi.fn();
    const lifecycle = createLifecycle({
      createInput: async () => {
        throw new Error('terminal');
      },
      submit,
    });

    await expect(lifecycle.submit()).resolves.toEqual({
      feedback: { retryable: false },
      kind: 'error',
    });
    expect(submit).not.toHaveBeenCalled();
  });
});
