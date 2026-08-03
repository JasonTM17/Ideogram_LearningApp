import { describe, expect, it } from 'vitest';

import { ActivityOperationIdentityError } from '@ideogram/api-client';
import { NativeApiHttpError, NativeApiTimeoutError } from '@ideogram/api-client/native';

import {
  createNativeReviewSubmissionInput,
  describeNativeReviewError,
} from './native-review-state';

describe('native review state', () => {
  it('creates the shared server-authoritative review payload', () => {
    expect(
      createNativeReviewSubmissionInput({
        createIdempotencyKey: () => '123e4567-e89b-42d3-a456-426614174002',
        grade: 'good',
        identity: { deviceId: '123e4567-e89b-42d3-a456-426614174001', deviceSequence: 7 },
        itemId: '123e4567-e89b-42d3-a456-426614174003',
        now: new Date('2026-08-03T00:00:00.000Z'),
        timezone: 'Asia/Ho_Chi_Minh',
      }),
    ).toEqual({
      deviceId: '123e4567-e89b-42d3-a456-426614174001',
      deviceSequence: 7,
      grade: 'good',
      idempotencyKey: '123e4567-e89b-42d3-a456-426614174002',
      itemId: '123e4567-e89b-42d3-a456-426614174003',
      reviewedAtClient: '2026-08-03T00:00:00.000Z',
      timezone: 'Asia/Ho_Chi_Minh',
    });
  });

  it('permits retry only for uncertain persistence outcomes', () => {
    expect(describeNativeReviewError(new NativeApiTimeoutError())).toMatchObject({
      requiresSignIn: false,
      retryable: true,
    });
    expect(describeNativeReviewError(new NativeApiHttpError(401))).toMatchObject({
      requiresSignIn: true,
      retryable: false,
    });
    expect(
      describeNativeReviewError(
        new ActivityOperationIdentityError('storage_failure', 'Secure storage unavailable.'),
      ),
    ).toMatchObject({ code: 'STORAGE_ERROR', retryable: false });
  });
});
