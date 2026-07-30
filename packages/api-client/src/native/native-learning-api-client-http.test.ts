import { describe, expect, it, vi } from 'vitest';

import {
  NativeApiHttpError,
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
