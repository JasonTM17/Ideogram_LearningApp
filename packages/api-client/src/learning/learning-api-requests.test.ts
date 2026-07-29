import { describe, expect, it } from 'vitest';

import {
  createActivityAttemptApiRequest,
  createReviewSubmissionApiRequest,
  plannedLearningApiRoutes,
} from './learning-api-requests';

describe('learning API requests', () => {
  const reviewInput = {
    deviceId: '123e4567-e89b-42d3-a456-426614174001',
    deviceSequence: 7,
    grade: 'good',
    idempotencyKey: '123e4567-e89b-42d3-a456-426614174002',
    itemId: '123e4567-e89b-42d3-a456-426614174003',
    reviewedAtClient: '2026-07-29T00:00:00.000Z',
    timezone: 'Asia/Ho_Chi_Minh',
  };

  it('creates the single review operation envelope shared by web and mobile', () => {
    expect(createReviewSubmissionApiRequest(reviewInput)).toEqual({
      body: reviewInput,
      method: 'POST',
      path: plannedLearningApiRoutes.reviewSubmit,
    });
  });

  it('fails closed when a device sequence is not a positive integer', () => {
    expect(() => createReviewSubmissionApiRequest({ ...reviewInput, deviceSequence: 0 })).toThrow();
  });

  it('creates the activity envelope without exposing server evaluation fields', () => {
    const activityInput = {
      activityId: 'ja-n5-u1-l1-vocab',
      contentReleaseId: 'ja-n5-pilot-v1',
      deviceId: '123e4567-e89b-42d3-a456-426614174001',
      deviceSequence: 8,
      idempotencyKey: '123e4567-e89b-42d3-a456-426614174004',
      responsePayload: { answer: '私' },
      reviewedAtClient: '2026-07-29T00:00:00.000Z',
      timezone: 'Asia/Ho_Chi_Minh',
    };

    expect(createActivityAttemptApiRequest(activityInput)).toEqual({
      body: activityInput,
      method: 'POST',
      path: plannedLearningApiRoutes.activitySubmit,
    });
  });
});
