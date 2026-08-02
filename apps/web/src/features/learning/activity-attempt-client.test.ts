import { describe, expect, it, vi } from 'vitest';

import {
  createVocabularyActivityAttemptInput,
  describeWebActivityAttemptError,
  submitWebActivityAttempt,
  WebActivityAttemptError,
} from './activity-attempt-client';

import { ActivityOperationIdentityError } from '@ideogram/api-client';

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

const receipt = {
  attemptId: '123e4567-e89b-42d3-a456-426614174003',
  completedActivityCount: 1,
  completionState: 'completed',
  idempotentReplay: false,
  lessonId: 'greetings-01',
  progressState: 'in_progress',
  totalActivityCount: 2,
} as const;

const response = (status: number, payload: unknown = receipt, contentType = 'application/json') =>
  new Response(JSON.stringify(payload), { headers: { 'content-type': contentType }, status });

describe('web activity attempt client', () => {
  it('builds the vocabulary acknowledgement payload from one reserved identity', () => {
    const attempt = createVocabularyActivityAttemptInput({
      activityId: input.activityId,
      contentReleaseId: input.contentReleaseId,
      createIdempotencyKey: () => input.idempotencyKey,
      identity: { deviceId: input.deviceId, deviceSequence: input.deviceSequence },
      now: new Date(input.reviewedAtClient),
      timezone: input.timezone,
    });

    expect(attempt).toEqual(input);
  });

  it('sends cookie-authenticated no-store JSON and parses the server receipt', async () => {
    const fetchImplementation = vi.fn().mockResolvedValue(response(200));

    await expect(submitWebActivityAttempt(input, { fetchImplementation })).resolves.toEqual(
      receipt,
    );
    expect(fetchImplementation).toHaveBeenCalledWith(
      '/api/v1/learning/activities/submit',
      expect.objectContaining({
        cache: 'no-store',
        credentials: 'same-origin',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        method: 'POST',
        redirect: 'error',
      }),
    );
    expect(JSON.parse(fetchImplementation.mock.calls[0]?.[1].body)).toEqual(input);
  });

  it.each([
    [401, 'UNAUTHORIZED'],
    [403, 'FORBIDDEN'],
    [409, 'INVALID_REQUEST'],
    [429, 'RATE_LIMITED'],
    [503, 'SERVER_ERROR'],
  ] as const)('maps HTTP %i to an opaque %s error', async (status, code) => {
    await expect(
      submitWebActivityAttempt(input, {
        fetchImplementation: vi.fn().mockResolvedValue(response(status)),
      }),
    ).rejects.toEqual(expect.objectContaining({ code, status }));
  });

  it('marks only uncertain outcomes as safe to retry', async () => {
    const retryableError = await submitWebActivityAttempt(input, {
      fetchImplementation: vi.fn().mockRejectedValue(new Error('offline')),
    }).catch((error: unknown) => error);
    const blockedError = await submitWebActivityAttempt(input, {
      fetchImplementation: vi.fn().mockResolvedValue(response(401)),
    }).catch((error: unknown) => error);

    expect(describeWebActivityAttemptError(retryableError)).toMatchObject({ retryable: true });
    expect(describeWebActivityAttemptError(blockedError)).toMatchObject({ retryable: false });
    expect(
      describeWebActivityAttemptError(
        new ActivityOperationIdentityError('storage_failure', 'Browser storage is unavailable.'),
      ),
    ).toMatchObject({ code: 'STORAGE_ERROR', retryable: false });
    expect(
      describeWebActivityAttemptError(
        new ActivityOperationIdentityError(
          'device_id_failure',
          'Browser UUID generation is unavailable.',
        ),
      ),
    ).toMatchObject({ code: 'IDENTITY_ERROR', retryable: false });
  });

  it('rejects malformed success responses without exposing their payload', async () => {
    await expect(
      submitWebActivityAttempt(input, {
        fetchImplementation: vi.fn().mockResolvedValue(response(200, { internal: 'nope' })),
      }),
    ).rejects.toBeInstanceOf(WebActivityAttemptError);
    await expect(
      submitWebActivityAttempt(input, {
        fetchImplementation: vi.fn().mockResolvedValue(response(200, receipt, 'text/html')),
      }),
    ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });
});
