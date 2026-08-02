import { describe, expect, it } from 'vitest';

import { ActivityOperationIdentityError } from '@ideogram/api-client';
import { NativeApiHttpError, NativeApiTimeoutError } from '@ideogram/api-client/native';

import {
  createNativeVocabularyActivityAttemptInput,
  describeNativeVocabularyActivityError,
} from './vocabulary-activity-state';

const input = {
  activityId: 'greeting-vocabulary',
  contentReleaseId: 'japanese-n5-v1',
  deviceId: '123e4567-e89b-42d3-a456-426614174001',
  deviceSequence: 7,
  idempotencyKey: '123e4567-e89b-42d3-a456-426614174002',
  responsePayload: { acknowledged: true },
  reviewedAtClient: '2026-08-01T00:00:00.000Z',
  timezone: 'Asia/Ho_Chi_Minh',
} as const;

describe('native vocabulary activity state', () => {
  it('builds the server evaluator vocabulary acknowledgement payload', () => {
    expect(
      createNativeVocabularyActivityAttemptInput({
        activityId: input.activityId,
        contentReleaseId: input.contentReleaseId,
        createIdempotencyKey: () => input.idempotencyKey,
        identity: { deviceId: input.deviceId, deviceSequence: input.deviceSequence },
        now: new Date(input.reviewedAtClient),
        timezone: input.timezone,
      }),
    ).toEqual(input);
  });

  it('permits retry only for opaque outcomes where the server may have accepted the attempt', () => {
    expect(describeNativeVocabularyActivityError(new NativeApiTimeoutError())).toMatchObject({
      retryable: true,
      requiresSignIn: false,
    });
    expect(describeNativeVocabularyActivityError(new NativeApiHttpError(401))).toMatchObject({
      requiresSignIn: true,
      retryable: false,
    });
    expect(
      describeNativeVocabularyActivityError(
        new ActivityOperationIdentityError('storage_failure', 'Secure storage unavailable.'),
      ),
    ).toMatchObject({ code: 'STORAGE_ERROR', retryable: false });
    expect(
      describeNativeVocabularyActivityError(
        new ActivityOperationIdentityError(
          'device_id_failure',
          'Native UUID generation is unavailable.',
        ),
      ),
    ).toMatchObject({ code: 'IDENTITY_ERROR', retryable: false });
  });
});
