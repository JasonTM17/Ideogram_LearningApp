import { describe, expect, it } from 'vitest';

import { ApiHttpError } from './api-response';
import {
  maximumJsonBodyBytes,
  parseTrustedWebOrigin,
  readJsonMutationBody,
} from './mutation-policy';

const trustedOrigin = 'https://learn.example.test';

const createMutation = (headers: HeadersInit = {}): Request =>
  new Request(`${trustedOrigin}/api/v1/learning/reviews/submit`, {
    body: '{}',
    headers: {
      'content-type': 'application/json; charset=utf-8',
      origin: trustedOrigin,
      'sec-fetch-site': 'same-origin',
      ...headers,
    },
    method: 'POST',
  });

const expectApiError = async (operation: Promise<unknown>, code: ApiHttpError['code']) => {
  const error = await operation.catch((reason: unknown) => reason);

  expect(error).toBeInstanceOf(ApiHttpError);
  expect((error as ApiHttpError).code).toBe(code);
};

describe('mutation request policy', () => {
  it('accepts and parses a same-origin JSON cookie mutation', async () => {
    await expect(
      readJsonMutationBody(createMutation(), {
        authenticationSource: 'cookie',
        trustedOrigin,
      }),
    ).resolves.toEqual({});
  });

  it.each([
    [{ origin: 'https://attacker.example' }, 'FORBIDDEN'],
    [{ 'sec-fetch-site': 'cross-site' }, 'FORBIDDEN'],
    [{ 'content-type': 'text/plain' }, 'INVALID_REQUEST'],
    [{ 'content-length': '65537' }, 'INVALID_REQUEST'],
  ])('rejects a forged or malformed cookie mutation', async (headers, code) => {
    await expectApiError(
      readJsonMutationBody(createMutation(headers), {
        authenticationSource: 'cookie',
        trustedOrigin,
      }),
      code as ApiHttpError['code'],
    );
  });

  it('requires Origin for cookie auth but allows native bearer requests without it', async () => {
    const request = createMutation();
    request.headers.delete('origin');
    request.headers.delete('sec-fetch-site');

    await expect(
      readJsonMutationBody(request.clone(), {
        authenticationSource: 'cookie',
        trustedOrigin,
      }),
    ).rejects.toThrow(/Origin/u);

    await expect(
      readJsonMutationBody(request, {
        authenticationSource: 'bearer',
        trustedOrigin,
      }),
    ).resolves.toEqual({});
  });

  it('rejects an oversized streamed body even when Content-Length is absent', async () => {
    const request = new Request(`${trustedOrigin}/api/v1/learning/reviews/submit`, {
      body: JSON.stringify({ answer: 'x'.repeat(maximumJsonBodyBytes) }),
      headers: {
        'content-type': 'application/json',
        origin: trustedOrigin,
        'sec-fetch-site': 'same-origin',
      },
      method: 'POST',
    });

    request.headers.delete('content-length');
    expect(request.headers.get('content-length')).toBeNull();

    await expectApiError(
      readJsonMutationBody(request, {
        authenticationSource: 'cookie',
        trustedOrigin,
      }),
      'INVALID_REQUEST',
    );
  });

  it('requires a canonical HTTPS trusted origin outside local development', () => {
    expect(parseTrustedWebOrigin(trustedOrigin)).toBe(trustedOrigin);
    expect(() => parseTrustedWebOrigin('http://learn.example.test')).toThrow(ApiHttpError);
    expect(parseTrustedWebOrigin('http://127.0.0.1:3000', { allowLocalHttp: true })).toBe(
      'http://127.0.0.1:3000',
    );
  });
});
