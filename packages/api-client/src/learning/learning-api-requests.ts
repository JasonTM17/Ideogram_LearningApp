import {
  activityAttemptInputSchema,
  learnerCatalogResponseSchema,
  reviewSubmissionInputSchema,
} from '@ideogram/contracts';

import type {
  ActivityAttemptInput,
  LearnerCatalogResponse,
  ReviewSubmissionInput,
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
  body: activityAttemptInputSchema.parse(input),
  method: 'POST',
  path: plannedLearningApiRoutes.activitySubmit,
});

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
