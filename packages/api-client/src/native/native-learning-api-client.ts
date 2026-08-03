import {
  createActivityAttemptApiRequest,
  createLearnerCatalogApiRequest,
  createLearnerReviewQueueApiRequest,
  createOfflineMediaManifestApiRequest,
  createPlacementAnswerApiRequest,
  createPlacementCatalogApiRequest,
  createPlacementSessionReadApiRequest,
  createPlacementSessionStartApiRequest,
  createPlacementSessionSubmitApiRequest,
  createReviewSubmissionApiRequest,
  parseActivityAttemptApiResponse,
  parseLearnerCatalogApiResponse,
  parseLearnerReviewQueueApiResponse,
  parseOfflineMediaManifestApiResponse,
  parsePlacementAnswerApiResponse,
  parsePlacementCatalogApiResponse,
  parsePlacementSessionApiResponse,
  parsePlacementSessionStartApiResponse,
  parseReviewSubmissionApiResponse,
} from '../learning/learning-api-requests';
import { createTutorTurnApiRequest, parseTutorTurnApiResponse } from '../ai/tutor-api-requests';
import { NativeApiConfigurationError, NativeApiInvalidRequestError } from './native-api-errors';
import { executeNativeJsonGet, executeNativeJsonPost } from './native-api-json-request';
import { validateNativeApiOrigin } from './native-api-origin';

import type {
  ActivityAttemptReceipt,
  LearnerCatalogResponse,
  OfflineMediaManifest,
  PlacementAnswerReceipt,
  PlacementCatalogResponse,
  PlacementSessionReceipt,
  PlacementSessionStartReceipt,
  ReviewQueueResponse,
  ReviewSubmissionReceipt,
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
  getLearnerReviewQueue: (options?: NativeApiRequestOptions) => Promise<ReviewQueueResponse>;
  getOfflineMediaManifest: (options?: NativeApiRequestOptions) => Promise<OfflineMediaManifest>;
  getPlacementCatalog: (options?: NativeApiRequestOptions) => Promise<PlacementCatalogResponse>;
  getPlacementSession: (
    sessionId: string,
    options?: NativeApiRequestOptions,
  ) => Promise<PlacementSessionReceipt>;
  startPlacementSession: (
    input: unknown,
    options?: NativeApiRequestOptions,
  ) => Promise<PlacementSessionStartReceipt>;
  submitPlacementAnswer: (
    sessionId: string,
    input: unknown,
    options?: NativeApiRequestOptions,
  ) => Promise<PlacementAnswerReceipt>;
  submitPlacementSession: (
    input: unknown,
    options?: NativeApiRequestOptions,
  ) => Promise<PlacementSessionReceipt>;
  submitActivityAttempt: (
    input: unknown,
    options?: NativeApiRequestOptions,
  ) => Promise<ActivityAttemptReceipt>;
  submitReview: (
    input: unknown,
    options?: NativeApiRequestOptions,
  ) => Promise<ReviewSubmissionReceipt>;
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
  const reviewQueueRequest = createLearnerReviewQueueApiRequest();
  const offlineMediaRequest = createOfflineMediaManifestApiRequest();
  const placementCatalogRequest = createPlacementCatalogApiRequest();

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
    getLearnerReviewQueue: (requestOptions: NativeApiRequestOptions = {}) =>
      executeNativeJsonGet({
        callerSignal: requestOptions.signal,
        fetchImplementation: options.fetch,
        parse: parseLearnerReviewQueueApiResponse,
        sessionProvider: options.sessionProvider,
        timeoutMs: requestTimeoutMs,
        url: `${apiOrigin}${reviewQueueRequest.path}`,
      }),
    getOfflineMediaManifest: (requestOptions: NativeApiRequestOptions = {}) =>
      executeNativeJsonGet({
        callerSignal: requestOptions.signal,
        fetchImplementation: options.fetch,
        parse: parseOfflineMediaManifestApiResponse,
        sessionProvider: options.sessionProvider,
        timeoutMs: requestTimeoutMs,
        url: `${apiOrigin}${offlineMediaRequest.path}`,
      }),
    getPlacementCatalog: (requestOptions: NativeApiRequestOptions = {}) =>
      executeNativeJsonGet({
        callerSignal: requestOptions.signal,
        fetchImplementation: options.fetch,
        parse: parsePlacementCatalogApiResponse,
        sessionProvider: options.sessionProvider,
        timeoutMs: requestTimeoutMs,
        url: `${apiOrigin}${placementCatalogRequest.path}`,
      }),
    getPlacementSession: (sessionId: string, requestOptions: NativeApiRequestOptions = {}) => {
      let request: ReturnType<typeof createPlacementSessionReadApiRequest>;
      try {
        request = createPlacementSessionReadApiRequest(sessionId);
      } catch {
        return Promise.reject(new NativeApiInvalidRequestError());
      }
      return executeNativeJsonGet({
        callerSignal: requestOptions.signal,
        fetchImplementation: options.fetch,
        parse: parsePlacementSessionApiResponse,
        sessionProvider: options.sessionProvider,
        timeoutMs: requestTimeoutMs,
        url: `${apiOrigin}${request.path}`,
      });
    },
    startPlacementSession: async (input: unknown, requestOptions: NativeApiRequestOptions = {}) => {
      let request: ReturnType<typeof createPlacementSessionStartApiRequest>;
      try {
        request = createPlacementSessionStartApiRequest(input);
      } catch {
        throw new NativeApiInvalidRequestError();
      }
      return executeNativeJsonPost({
        body: JSON.stringify(request.body),
        callerSignal: requestOptions.signal,
        fetchImplementation: options.fetch,
        parse: parsePlacementSessionStartApiResponse,
        sessionProvider: options.sessionProvider,
        timeoutMs: requestTimeoutMs,
        url: `${apiOrigin}${request.path}`,
      });
    },
    submitPlacementAnswer: async (
      sessionId: string,
      input: unknown,
      requestOptions: NativeApiRequestOptions = {},
    ) => {
      let request: ReturnType<typeof createPlacementAnswerApiRequest>;
      try {
        request = createPlacementAnswerApiRequest({ input, sessionId });
      } catch {
        throw new NativeApiInvalidRequestError();
      }
      return executeNativeJsonPost({
        body: JSON.stringify(request.body),
        callerSignal: requestOptions.signal,
        fetchImplementation: options.fetch,
        parse: parsePlacementAnswerApiResponse,
        sessionProvider: options.sessionProvider,
        timeoutMs: requestTimeoutMs,
        url: `${apiOrigin}${request.path}`,
      });
    },
    submitPlacementSession: async (
      input: unknown,
      requestOptions: NativeApiRequestOptions = {},
    ) => {
      let request: ReturnType<typeof createPlacementSessionSubmitApiRequest>;
      try {
        request = createPlacementSessionSubmitApiRequest(input);
      } catch {
        throw new NativeApiInvalidRequestError();
      }
      return executeNativeJsonPost({
        body: JSON.stringify(request.body),
        callerSignal: requestOptions.signal,
        fetchImplementation: options.fetch,
        parse: parsePlacementSessionApiResponse,
        sessionProvider: options.sessionProvider,
        timeoutMs: requestTimeoutMs,
        url: `${apiOrigin}${request.path}`,
      });
    },
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
    submitReview: async (input: unknown, requestOptions: NativeApiRequestOptions = {}) => {
      let reviewRequest: ReturnType<typeof createReviewSubmissionApiRequest>;
      let body: string | undefined;

      try {
        reviewRequest = createReviewSubmissionApiRequest(input);
        body = JSON.stringify(reviewRequest.body);
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
        parse: parseReviewSubmissionApiResponse,
        sessionProvider: options.sessionProvider,
        timeoutMs: requestTimeoutMs,
        url: `${apiOrigin}${reviewRequest.path}`,
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
