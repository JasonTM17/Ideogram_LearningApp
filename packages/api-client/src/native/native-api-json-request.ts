import {
  NativeApiError,
  NativeApiHttpError,
  NativeApiInvalidResponseError,
  NativeApiNetworkError,
  NativeApiSessionProviderError,
  NativeApiSessionRequiredError,
} from './native-api-errors';
import { createNativeApiAbortScope } from './native-api-abort-scope';
import {
  assertNativeApiSessionIdentity,
  captureNativeApiSessionIdentity,
  validateNativeApiSession,
} from './native-api-session';

import type { NativeApiSession, NativeApiSessionProvider } from './native-api-session';

export interface NativeApiFetchHeaders {
  get: (name: string) => string | null;
}

export interface NativeApiFetchResponse {
  readonly headers: NativeApiFetchHeaders;
  readonly status: number;
  json: () => Promise<unknown>;
}

export interface NativeApiFetchRequestInit {
  readonly credentials: 'omit';
  readonly headers: Readonly<Record<string, string>>;
  readonly method: 'GET';
  readonly redirect: 'error';
  readonly signal: AbortSignal;
}

export type NativeApiFetch = (
  url: string,
  init: NativeApiFetchRequestInit,
) => Promise<NativeApiFetchResponse>;

export interface NativeApiRequestOptions {
  signal?: AbortSignal;
}

interface NativeJsonGetOptions<TResult> {
  callerSignal: AbortSignal | undefined;
  fetchImplementation: NativeApiFetch;
  parse: (input: unknown) => TResult;
  sessionProvider: NativeApiSessionProvider;
  timeoutMs: number;
  url: string;
}

type InspectedResponse<TResult> =
  { error: NativeApiError; ok: false } | { ok: true; value: TResult };

const isJsonContentType = (value: unknown): boolean => {
  if (typeof value !== 'string') {
    return false;
  }

  const mediaType = value?.split(';', 1)[0]?.trim().toLowerCase();
  return (
    mediaType === 'application/json' ||
    (mediaType?.startsWith('application/') === true && mediaType.endsWith('+json'))
  );
};

const readSession = async (
  scope: ReturnType<typeof createNativeApiAbortScope>,
  provider: NativeApiSessionProvider,
): Promise<NativeApiSession | null> => {
  try {
    return validateNativeApiSession(await scope.run(provider));
  } catch (error) {
    scope.throwIfAborted();
    if (error instanceof NativeApiError) throw error;
    throw new NativeApiSessionProviderError();
  }
};

const inspectResponse = async <TResult>(
  response: unknown,
  parse: (input: unknown) => TResult,
  scope: ReturnType<typeof createNativeApiAbortScope>,
): Promise<InspectedResponse<TResult>> => {
  if (!response || typeof response !== 'object') {
    return { error: new NativeApiInvalidResponseError(), ok: false };
  }

  const candidate = response as Partial<NativeApiFetchResponse>;
  const status = candidate.status;
  if (typeof status !== 'number' || !Number.isInteger(status) || status < 100 || status > 599) {
    return { error: new NativeApiInvalidResponseError(), ok: false };
  }

  if (status !== 200) {
    return { error: new NativeApiHttpError(status), ok: false };
  }

  const readHeader = candidate.headers?.get;
  if (typeof readHeader !== 'function') {
    return { error: new NativeApiInvalidResponseError(), ok: false };
  }

  let contentType: unknown;
  try {
    contentType = readHeader.call(candidate.headers, 'content-type');
  } catch {
    return { error: new NativeApiInvalidResponseError(), ok: false };
  }

  if (!isJsonContentType(contentType)) {
    return { error: new NativeApiInvalidResponseError(), ok: false };
  }

  const readJson = candidate.json;
  if (typeof readJson !== 'function') {
    return { error: new NativeApiInvalidResponseError(), ok: false };
  }

  let payload: unknown;
  try {
    payload = await scope.run(() => readJson.call(candidate));
  } catch {
    scope.throwIfAborted();
    return { error: new NativeApiInvalidResponseError(), ok: false };
  }

  try {
    return { ok: true, value: parse(payload) };
  } catch {
    return { error: new NativeApiInvalidResponseError(), ok: false };
  }
};

export const executeNativeJsonGet = async <TResult>(
  options: NativeJsonGetOptions<TResult>,
): Promise<TResult> => {
  const scope = createNativeApiAbortScope(options.callerSignal, options.timeoutMs);

  try {
    const initialSession = await readSession(scope, options.sessionProvider);
    if (initialSession === null) throw new NativeApiSessionRequiredError();
    const initialIdentity = captureNativeApiSessionIdentity(initialSession);

    let response: NativeApiFetchResponse;
    try {
      response = await scope.run(() =>
        options.fetchImplementation(options.url, {
          credentials: 'omit',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${initialSession.accessToken}`,
          },
          method: 'GET',
          redirect: 'error',
          signal: scope.signal,
        }),
      );
    } catch {
      scope.throwIfAborted();
      throw new NativeApiNetworkError();
    }

    const inspectedResponse = await inspectResponse(response, options.parse, scope);
    const currentSession = await readSession(scope, options.sessionProvider);
    assertNativeApiSessionIdentity(initialIdentity, currentSession);

    if (!inspectedResponse.ok) throw inspectedResponse.error;
    return inspectedResponse.value;
  } finally {
    scope.dispose();
  }
};
