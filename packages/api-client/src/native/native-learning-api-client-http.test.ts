import { describe, expect, it, vi } from 'vitest';

import {
  NativeApiHttpError,
  NativeApiInvalidRequestError,
  NativeApiInvalidResponseError,
  NativeApiNetworkError,
} from './native-api-errors';
import { createNativeApiClient } from './native-learning-api-client';

import type {
  NativeApiFetch,
  NativeApiFetchRequestInit,
  NativeApiFetchResponse,
} from './native-api-json-request';
import type { NativeApiSessionProvider } from './native-api-session';

const validCatalog = { languagePacks: [] };
const validActivityInput = {
  activityId: 'ja-n5-l01-vocabulary',
  contentReleaseId: 'ja-n5-pilot-v1',
  deviceId: '123e4567-e89b-42d3-a456-426614174001',
  deviceSequence: 7,
  idempotencyKey: '123e4567-e89b-42d3-a456-426614174002',
  responsePayload: { acknowledged: true },
  reviewedAtClient: '2026-07-29T00:00:00.000Z',
  timezone: 'Asia/Ho_Chi_Minh',
} as const;
const validActivityReceipt = {
  attemptId: '123e4567-e89b-42d3-a456-426614174004',
  completedActivityCount: 1,
  completionState: 'completed',
  idempotentReplay: false,
  lessonId: 'ja-n5-l01',
  progressState: 'completed',
  totalActivityCount: 1,
} as const;
const stableSession = {
  accessToken: 'header-safe-token',
  sessionEpoch: 4,
  userId: 'learner-1',
};

const createResponse = (
  status: number,
  payload: unknown = validCatalog,
  contentType = 'application/json; charset=utf-8',
): NativeApiFetchResponse => ({
  headers: {
    get: (name) => (name.toLowerCase() === 'content-type' ? contentType : null),
  },
  json: async () => payload,
  status,
});

const createClient = (
  fetchImplementation: NativeApiFetch,
  sessionProvider: NativeApiSessionProvider = async () => stableSession,
) =>
  createNativeApiClient({
    apiOrigin: 'https://api.example.test/',
    fetch: fetchImplementation,
    sessionProvider,
  });

describe('native learner catalog HTTP transport', () => {
  it('sends a bearer GET with JSON accept and redirect rejection', async () => {
    let capturedInit: NativeApiFetchRequestInit | undefined;
    const fetchImplementation: NativeApiFetch = vi.fn(async (url, init) => {
      expect(url).toBe('https://api.example.test/api/v1/learning/catalog');
      capturedInit = init;
      return createResponse(200);
    });

    await expect(createClient(fetchImplementation).getLearnerCatalog()).resolves.toEqual(
      validCatalog,
    );
    expect(capturedInit).toMatchObject({
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer header-safe-token',
      },
      credentials: 'omit',
      method: 'GET',
      redirect: 'error',
    });
    expect(capturedInit?.signal).toBeInstanceOf(AbortSignal);
  });

  it('sends a validated activity POST with the exact public body and JSON headers', async () => {
    let capturedUrl: string | undefined;
    let capturedInit: NativeApiFetchRequestInit | undefined;
    const fetchImplementation: NativeApiFetch = vi.fn(async (url, init) => {
      capturedUrl = url;
      capturedInit = init;
      return createResponse(200, validActivityReceipt);
    });

    await expect(
      createClient(fetchImplementation).submitActivityAttempt(validActivityInput),
    ).resolves.toEqual(validActivityReceipt);
    expect(capturedUrl).toBe('https://api.example.test/api/v1/learning/activities/submit');
    expect(capturedInit).toMatchObject({
      body: JSON.stringify(validActivityInput),
      credentials: 'omit',
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer header-safe-token',
        'Content-Type': 'application/json',
      },
      method: 'POST',
      redirect: 'error',
    });
    expect(capturedInit?.signal).toBeInstanceOf(AbortSignal);
  });

  it('rejects malformed or non-serializable activity input as an opaque Promise error', async () => {
    const fetchImplementation = vi.fn<NativeApiFetch>();
    const client = createClient(fetchImplementation);
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;

    await expect(client.submitActivityAttempt({})).rejects.toBeInstanceOf(
      NativeApiInvalidRequestError,
    );
    await expect(
      client.submitActivityAttempt({ ...validActivityInput, responsePayload: { cyclic } }),
    ).rejects.toBeInstanceOf(NativeApiInvalidRequestError);
    expect(fetchImplementation).not.toHaveBeenCalled();
  });

  it.each([
    [401, 'UNAUTHORIZED'],
    [403, 'FORBIDDEN'],
    [429, 'RATE_LIMITED'],
    [500, 'SERVER_ERROR'],
    [503, 'SERVER_ERROR'],
  ] as const)('maps HTTP %i to the opaque %s error', async (status, code) => {
    let bodyRead = false;
    const fetchImplementation: NativeApiFetch = async () => ({
      ...createResponse(status),
      json: async () => {
        bodyRead = true;
        return { token: 'response-secret' };
      },
    });

    const error = await createClient(fetchImplementation)
      .getLearnerCatalog()
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(NativeApiHttpError);
    expect(error).toMatchObject({ code, status });
    expect((error as Error).message).not.toContain('response-secret');
    expect(bodyRead).toBe(false);
  });

  it('maps fetch failures without retaining their token-bearing message', async () => {
    const fetchImplementation: NativeApiFetch = async () => {
      throw new Error('failed with Bearer response-secret');
    };

    const error = await createClient(fetchImplementation)
      .getLearnerCatalog()
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(NativeApiNetworkError);
    expect((error as Error).message).not.toContain('response-secret');
  });

  it('rejects invalid JSON without echoing parser details', async () => {
    const fetchImplementation: NativeApiFetch = async () => ({
      ...createResponse(200),
      json: async () => {
        throw new SyntaxError('Unexpected token from response-secret');
      },
    });

    const error = await createClient(fetchImplementation)
      .getLearnerCatalog()
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(NativeApiInvalidResponseError);
    expect((error as Error).message).not.toContain('response-secret');
  });

  it.each([
    createResponse(200, validCatalog, 'text/html'),
    createResponse(200, { ...validCatalog, privateAnswerKey: 'secret' }),
  ])('rejects non-JSON or non-contract catalog responses', async (response) => {
    const fetchImplementation: NativeApiFetch = async () => response;

    await expect(createClient(fetchImplementation).getLearnerCatalog()).rejects.toBeInstanceOf(
      NativeApiInvalidResponseError,
    );
  });

  it.each([
    null,
    {},
    { status: 200 },
    {
      headers: { get: () => 42 },
      json: async () => validCatalog,
      status: 200,
    },
  ])('maps a malformed injected-fetch response to an opaque error', async (response) => {
    const fetchImplementation: NativeApiFetch = async () =>
      response as unknown as NativeApiFetchResponse;

    await expect(createClient(fetchImplementation).getLearnerCatalog()).rejects.toBeInstanceOf(
      NativeApiInvalidResponseError,
    );
  });
});
