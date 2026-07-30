import {
  createLearnerCatalogApiRequest,
  parseLearnerCatalogApiResponse,
} from '../learning/learning-api-requests';
import { NativeApiConfigurationError } from './native-api-errors';
import { executeNativeJsonGet } from './native-api-json-request';
import { validateNativeApiOrigin } from './native-api-origin';

import type { LearnerCatalogResponse } from '@ideogram/contracts';
import type { NativeApiFetch, NativeApiRequestOptions } from './native-api-json-request';
import type { NativeApiSessionProvider } from './native-api-session';

export const DEFAULT_NATIVE_API_REQUEST_TIMEOUT_MS = 15_000;
const MAX_NATIVE_API_REQUEST_TIMEOUT_MS = 2_147_483_647;

export interface CreateNativeApiClientOptions {
  allowHttpLoopback?: boolean;
  apiOrigin: string;
  fetch: NativeApiFetch;
  requestTimeoutMs?: number;
  sessionProvider: NativeApiSessionProvider;
}

export interface NativeApiClient {
  getLearnerCatalog: (options?: NativeApiRequestOptions) => Promise<LearnerCatalogResponse>;
}

const validateRequestTimeout = (value: number): number => {
  if (!Number.isSafeInteger(value) || value <= 0 || value > MAX_NATIVE_API_REQUEST_TIMEOUT_MS) {
    throw new NativeApiConfigurationError();
  }
  return value;
};

export const createNativeApiClient = (options: CreateNativeApiClientOptions): NativeApiClient => {
  if (
    !options ||
    typeof options.fetch !== 'function' ||
    typeof options.sessionProvider !== 'function'
  ) {
    throw new NativeApiConfigurationError();
  }

  const apiOrigin = validateNativeApiOrigin(options.apiOrigin, {
    allowHttpLoopback: options.allowHttpLoopback === true,
  });
  const requestTimeoutMs = validateRequestTimeout(
    options.requestTimeoutMs ?? DEFAULT_NATIVE_API_REQUEST_TIMEOUT_MS,
  );
  const catalogRequest = createLearnerCatalogApiRequest();

  return Object.freeze({
    getLearnerCatalog: (requestOptions: NativeApiRequestOptions = {}) =>
      executeNativeJsonGet({
        callerSignal: requestOptions.signal,
        fetchImplementation: options.fetch,
        parse: parseLearnerCatalogApiResponse,
        sessionProvider: options.sessionProvider,
        timeoutMs: requestTimeoutMs,
        url: `${apiOrigin}${catalogRequest.path}`,
      }),
  });
};
