import { describe, expect, it, vi } from 'vitest';

import { NativeApiSessionChangedError, NativeApiSessionRequiredError } from './native-api-errors';
import { createNativeApiClient } from './native-learning-api-client';

import type { NativeApiFetch, NativeApiFetchResponse } from './native-api-json-request';
import type { NativeApiSession } from './native-api-session';

const response = (): NativeApiFetchResponse => ({
  headers: { get: () => 'application/json' },
  json: async () => ({ languagePacks: [] }),
  status: 200,
});

const activityResponse = (): NativeApiFetchResponse => ({
  headers: { get: () => 'application/json' },
  json: async () => ({
    attemptId: '123e4567-e89b-42d3-a456-426614174004',
    completedActivityCount: 1,
    completionState: 'completed',
    idempotentReplay: false,
    lessonId: 'ja-n5-l01',
    progressState: 'completed',
    totalActivityCount: 1,
  }),
  status: 200,
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

const session = (
  accessToken: string,
  userId = 'learner-1',
  sessionEpoch = 8,
): NativeApiSession => ({ accessToken, sessionEpoch, userId });

describe('native learner catalog session binding', () => {
  it.each([
    ['missing post-request session', null],
    ['account switch', session('next-token', 'learner-2')],
    ['session epoch change', session('next-token', 'learner-1', 9)],
  ] as const)('rejects a %s', async (_description, postRequestSession) => {
    const sessionProvider = vi
      .fn<() => Promise<NativeApiSession | null>>()
      .mockResolvedValueOnce(session('initial-token'))
      .mockResolvedValueOnce(postRequestSession);
    const fetchImplementation: NativeApiFetch = async () => response();
    const client = createNativeApiClient({
      apiOrigin: 'https://api.example.test',
      fetch: fetchImplementation,
      sessionProvider,
    });

    await expect(client.getLearnerCatalog()).rejects.toBeInstanceOf(NativeApiSessionChangedError);
  });

  it('binds activity POST results to the same user and session epoch', async () => {
    const sessionProvider = vi
      .fn<() => Promise<NativeApiSession | null>>()
      .mockResolvedValueOnce(session('initial-token'))
      .mockResolvedValueOnce(session('next-token', 'learner-2'));
    const client = createNativeApiClient({
      apiOrigin: 'https://api.example.test',
      fetch: async () => activityResponse(),
      sessionProvider,
    });

    await expect(client.submitActivityAttempt(activityInput)).rejects.toBeInstanceOf(
      NativeApiSessionChangedError,
    );
  });

  it('requires a session before issuing the request', async () => {
    const fetchImplementation = vi.fn<NativeApiFetch>();
    const client = createNativeApiClient({
      apiOrigin: 'https://api.example.test',
      fetch: fetchImplementation,
      sessionProvider: async () => null,
    });

    await expect(client.getLearnerCatalog()).rejects.toBeInstanceOf(NativeApiSessionRequiredError);
    expect(fetchImplementation).not.toHaveBeenCalled();
  });

  it('accepts token rotation within the same user and session epoch', async () => {
    const sessionProvider = vi
      .fn<() => Promise<NativeApiSession | null>>()
      .mockResolvedValueOnce(session('initial-token'))
      .mockResolvedValueOnce(session('rotated-token'));
    const fetchImplementation: NativeApiFetch = async () => response();
    const client = createNativeApiClient({
      apiOrigin: 'https://api.example.test',
      fetch: fetchImplementation,
      sessionProvider,
    });

    await expect(client.getLearnerCatalog()).resolves.toEqual({ languagePacks: [] });
  });

  it('isolates concurrent requests and evaluates each late response against current identity', async () => {
    let currentSession = session('initial-token');
    let resolveFirst: ((value: NativeApiFetchResponse) => void) | undefined;
    let resolveSecond: ((value: NativeApiFetchResponse) => void) | undefined;
    const fetchImplementation = vi
      .fn<NativeApiFetch>()
      .mockImplementationOnce(
        async () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockImplementationOnce(
        async () =>
          new Promise((resolve) => {
            resolveSecond = resolve;
          }),
      );
    const client = createNativeApiClient({
      apiOrigin: 'https://api.example.test',
      fetch: fetchImplementation,
      sessionProvider: async () => ({ ...currentSession }),
    });

    const firstRequest = client.getLearnerCatalog();
    await vi.waitFor(() => expect(fetchImplementation).toHaveBeenCalledTimes(1));
    const secondRequest = client.getLearnerCatalog();
    await vi.waitFor(() => expect(fetchImplementation).toHaveBeenCalledTimes(2));

    currentSession = session('rotated-token');
    resolveSecond?.(response());
    await expect(secondRequest).resolves.toEqual({ languagePacks: [] });

    currentSession = session('new-account-token', 'learner-2', 9);
    resolveFirst?.(response());
    await expect(firstRequest).rejects.toBeInstanceOf(NativeApiSessionChangedError);
  });
});
