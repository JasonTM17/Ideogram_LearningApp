import {
  activityAttemptInputSchema,
  activityAttemptReceiptSchema,
  learnerCatalogResponseSchema,
  reviewSubmissionInputSchema,
  reviewSubmissionReceiptSchema,
} from '@ideogram/contracts';

import type {
  ActivityAttemptInput,
  ActivityAttemptReceipt,
  LearnerCatalogResponse,
  ReviewSubmissionInput,
  ReviewSubmissionReceipt,
} from '@ideogram/contracts';

export const plannedLearningApiRoutes = {
  catalog: '/api/v1/learning/catalog',
  activitySubmit: '/api/v1/learning/activities/submit',
  reviewSubmit: '/api/v1/learning/reviews/submit',
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

export interface ReviewSubmissionApiRequest {
  body: ReviewSubmissionInput;
  method: 'POST';
  path: typeof plannedLearningApiRoutes.reviewSubmit;
}

export const createLearnerCatalogApiRequest = (): LearnerCatalogApiRequest => ({
  method: 'GET',
  path: plannedLearningApiRoutes.catalog,
});

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

export const parseActivityAttemptApiResponse = (input: unknown): ActivityAttemptReceipt =>
  activityAttemptReceiptSchema.parse(input);

export const parseReviewSubmissionApiResponse = (input: unknown): ReviewSubmissionReceipt =>
  reviewSubmissionReceiptSchema.parse(input);
