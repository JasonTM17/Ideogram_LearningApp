import {
  createActivityAttemptApiRequest,
  createLearnerCatalogApiRequest,
  parseActivityAttemptApiResponse,
  parseLearnerCatalogApiResponse,
} from '../learning/learning-api-requests';
import { createTutorTurnApiRequest, parseTutorTurnApiResponse } from '../ai/tutor-api-requests';
import { NativeApiConfigurationError, NativeApiInvalidRequestError } from './native-api-errors';
import { executeNativeJsonGet, executeNativeJsonPost } from './native-api-json-request';
import { validateNativeApiOrigin } from './native-api-origin';

import type {
  ActivityAttemptReceipt,
  LearnerCatalogResponse,
  TutorTurnReceipt,
} from '@ideogram/contracts';
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
  submitActivityAttempt: (
    input: unknown,
    options?: NativeApiRequestOptions,
  ) => Promise<ActivityAttemptReceipt>;
  submitTutorTurn: (input: unknown, options?: NativeApiRequestOptions) => Promise<TutorTurnReceipt>;
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
    submitActivityAttempt: async (input: unknown, requestOptions: NativeApiRequestOptions = {}) => {
      let activityRequest: ReturnType<typeof createActivityAttemptApiRequest>;
      let body: string | undefined;

      try {
        activityRequest = createActivityAttemptApiRequest(input);
        body = JSON.stringify(activityRequest.body);
      } catch {
        throw new NativeApiInvalidRequestError();
      }

      if (typeof body !== 'string') {
        throw new NativeApiInvalidRequestError();
      }

      return executeNativeJsonPost({
        body,
        callerSignal: requestOptions.signal,
        fetchImplementation: options.fetch,
        parse: parseActivityAttemptApiResponse,
        sessionProvider: options.sessionProvider,
        timeoutMs: requestTimeoutMs,
        url: `${apiOrigin}${activityRequest.path}`,
      });
    },
    submitTutorTurn: async (input: unknown, requestOptions: NativeApiRequestOptions = {}) => {
      let tutorRequest: ReturnType<typeof createTutorTurnApiRequest>;
      let body: string | undefined;

      try {
        tutorRequest = createTutorTurnApiRequest(input);
        body = JSON.stringify(tutorRequest.body);
      } catch {
        throw new NativeApiInvalidRequestError();
      }

      if (typeof body !== 'string') {
        throw new NativeApiInvalidRequestError();
      }

      return executeNativeJsonPost({
        body,
        callerSignal: requestOptions.signal,
        fetchImplementation: options.fetch,
        parse: parseTutorTurnApiResponse,
        sessionProvider: options.sessionProvider,
        timeoutMs: requestTimeoutMs,
        url: `${apiOrigin}${tutorRequest.path}`,
      });
    },
  });
};
