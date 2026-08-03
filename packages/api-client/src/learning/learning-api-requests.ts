import {
  activityAttemptInputSchema,
  activityAttemptReceiptSchema,
  learnerCatalogResponseSchema,
  offlineMediaManifestSchema,
  placementAnswerInputSchema,
  placementAnswerReceiptSchema,
  placementCatalogResponseSchema,
  placementSessionReceiptSchema,
  placementSessionStartInputSchema,
  placementSessionStartReceiptSchema,
  placementSessionSubmitInputSchema,
  reviewQueueResponseSchema,
  reviewSubmissionInputSchema,
  reviewSubmissionReceiptSchema,
} from '@ideogram/contracts';

import type {
  ActivityAttemptInput,
  ActivityAttemptReceipt,
  LearnerCatalogResponse,
  OfflineMediaManifest,
  PlacementAnswerInput,
  PlacementAnswerReceipt,
  PlacementCatalogResponse,
  PlacementSessionReceipt,
  PlacementSessionStartInput,
  PlacementSessionStartReceipt,
  ReviewQueueResponse,
  ReviewSubmissionInput,
  ReviewSubmissionReceipt,
} from '@ideogram/contracts';

export const plannedLearningApiRoutes = {
  catalog: '/api/v1/learning/catalog',
  offlineMedia: '/api/v1/learning/offline-media',
  activitySubmit: '/api/v1/learning/activities/submit',
  reviewSubmit: '/api/v1/learning/reviews/submit',
  reviewQueue: '/api/v1/learning/reviews',
  placementCatalog: '/api/v1/learning/placement',
  placementSessionStart: '/api/v1/learning/placement/sessions',
} as const;

export interface ActivityAttemptApiRequest {
  body: ActivityAttemptInput;
  method: 'POST';
  path: typeof plannedLearningApiRoutes.activitySubmit;
}

export interface LearnerCatalogApiRequest {
  method: 'GET';
  path: typeof plannedLearningApiRoutes.catalog;
}

export interface OfflineMediaManifestApiRequest {
  method: 'GET';
  path: typeof plannedLearningApiRoutes.offlineMedia;
}

export interface LearnerReviewQueueApiRequest {
  method: 'GET';
  path: typeof plannedLearningApiRoutes.reviewQueue;
}

export interface PlacementCatalogApiRequest {
  method: 'GET';
  path: typeof plannedLearningApiRoutes.placementCatalog;
}

export interface PlacementSessionStartApiRequest {
  body: PlacementSessionStartInput;
  method: 'POST';
  path: typeof plannedLearningApiRoutes.placementSessionStart;
}

export interface PlacementSessionReadApiRequest {
  method: 'GET';
  path: string;
}

export interface PlacementAnswerApiRequest {
  body: PlacementAnswerInput;
  method: 'POST';
  path: string;
}

export interface PlacementSessionSubmitApiRequest {
  body: Record<string, never>;
  method: 'POST';
  path: string;
}

export interface ReviewSubmissionApiRequest {
  body: ReviewSubmissionInput;
  method: 'POST';
  path: typeof plannedLearningApiRoutes.reviewSubmit;
}

export const createLearnerCatalogApiRequest = (): LearnerCatalogApiRequest => ({
  method: 'GET',
  path: plannedLearningApiRoutes.catalog,
});

export const createOfflineMediaManifestApiRequest = (): OfflineMediaManifestApiRequest => ({
  method: 'GET',
  path: plannedLearningApiRoutes.offlineMedia,
});

export const createLearnerReviewQueueApiRequest = (): LearnerReviewQueueApiRequest => ({
  method: 'GET',
  path: plannedLearningApiRoutes.reviewQueue,
});

export const createPlacementCatalogApiRequest = (): PlacementCatalogApiRequest => ({
  method: 'GET',
  path: plannedLearningApiRoutes.placementCatalog,
});

export const createPlacementSessionStartApiRequest = (
  input: unknown,
): PlacementSessionStartApiRequest => ({
  body: placementSessionStartInputSchema.parse(input),
  method: 'POST',
  path: plannedLearningApiRoutes.placementSessionStart,
});

export const createPlacementSessionReadApiRequest = (
  sessionId: string,
): PlacementSessionReadApiRequest => {
  const parsed = placementSessionSubmitInputSchema.parse({ placementSessionId: sessionId });
  return {
    method: 'GET',
    path: `${plannedLearningApiRoutes.placementSessionStart}/${parsed.placementSessionId}`,
  };
};

export const createPlacementAnswerApiRequest = ({
  input,
  sessionId,
}: {
  input: unknown;
  sessionId: string;
}): PlacementAnswerApiRequest => ({
  body: placementAnswerInputSchema.parse(input),
  method: 'POST',
  path: `${plannedLearningApiRoutes.placementSessionStart}/${sessionId}/answers`,
});

export const createPlacementSessionSubmitApiRequest = (
  input: unknown,
): PlacementSessionSubmitApiRequest => {
  const parsed = placementSessionSubmitInputSchema.parse(input);
  return {
    body: {},
    method: 'POST',
    path: `${plannedLearningApiRoutes.placementSessionStart}/${parsed.placementSessionId}/submit`,
  };
};

/**
 * Web and native submit the same response envelope. The server binds the
 * learner, calculates an internal payload hash, evaluates the response, then
 * invokes the private transaction. This builder validates only public input.
 */
export const createActivityAttemptApiRequest = (input: unknown): ActivityAttemptApiRequest => ({
  body: assertJsonSafeActivityAttemptInput(activityAttemptInputSchema.parse(input)),
  method: 'POST',
  path: plannedLearningApiRoutes.activitySubmit,
});

const isJsonSafeValue = (value: unknown, ancestors: Set<object> = new Set()): boolean => {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return true;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) && !Object.is(value, -0);
  }

  if (typeof value !== 'object') {
    return false;
  }

  if (ancestors.has(value)) {
    return false;
  }

  try {
    ancestors.add(value);
    if (Array.isArray(value)) {
      const prototype = Object.getPrototypeOf(value);
      if (prototype !== Array.prototype && prototype !== null) {
        return false;
      }

      const keys = Object.keys(value);
      const ownKeys = Reflect.ownKeys(value);
      if (
        keys.length !== value.length ||
        keys.some((key, index) => key !== String(index)) ||
        ownKeys.some(
          (key) =>
            key !== 'length' &&
            (typeof key === 'symbol' || !/^\d+$/u.test(key) || !keys.includes(key)),
        )
      ) {
        return false;
      }

      return value.every((item) => isJsonSafeValue(item, ancestors));
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      return false;
    }

    return Reflect.ownKeys(value).every((key) => {
      if (typeof key === 'symbol') {
        return false;
      }

      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      return (
        descriptor?.enumerable === true &&
        'value' in descriptor &&
        isJsonSafeValue(descriptor.value, ancestors)
      );
    });
  } catch {
    return false;
  } finally {
    ancestors.delete(value);
  }
};

const assertJsonSafeActivityAttemptInput = (input: ActivityAttemptInput): ActivityAttemptInput => {
  if (!isJsonSafeValue(input.responsePayload)) {
    throw new TypeError('Activity response payload must contain JSON-safe values.');
  }

  return input;
};

/**
 * The server binds the learner and calculates an internal payload hash before
 * it invokes the private review transaction. Browser and native callers never
 * provide the hash because it is not a public API field.
 */
export const createReviewSubmissionApiRequest = (input: unknown): ReviewSubmissionApiRequest => ({
  body: reviewSubmissionInputSchema.parse(input),
  method: 'POST',
  path: plannedLearningApiRoutes.reviewSubmit,
});

export const parseLearnerCatalogApiResponse = (input: unknown): LearnerCatalogResponse =>
  learnerCatalogResponseSchema.parse(input);

export const parseOfflineMediaManifestApiResponse = (input: unknown): OfflineMediaManifest =>
  offlineMediaManifestSchema.parse(input);

export const parseLearnerReviewQueueApiResponse = (input: unknown): ReviewQueueResponse =>
  reviewQueueResponseSchema.parse(input);

export const parsePlacementCatalogApiResponse = (input: unknown): PlacementCatalogResponse =>
  placementCatalogResponseSchema.parse(input);

export const parsePlacementSessionStartApiResponse = (
  input: unknown,
): PlacementSessionStartReceipt => placementSessionStartReceiptSchema.parse(input);

export const parsePlacementAnswerApiResponse = (input: unknown): PlacementAnswerReceipt =>
  placementAnswerReceiptSchema.parse(input);

export const parsePlacementSessionApiResponse = (input: unknown): PlacementSessionReceipt =>
  placementSessionReceiptSchema.parse(input);

export const parseActivityAttemptApiResponse = (input: unknown): ActivityAttemptReceipt =>
  activityAttemptReceiptSchema.parse(input);

export const parseReviewSubmissionApiResponse = (input: unknown): ReviewSubmissionReceipt =>
  reviewSubmissionReceiptSchema.parse(input);
