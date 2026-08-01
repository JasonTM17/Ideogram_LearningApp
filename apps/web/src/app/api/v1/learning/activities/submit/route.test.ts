import { describe, expect, it, vi } from 'vitest';

import type { AuthenticatedSupabaseRequest } from '@/lib/supabase/request-auth';
import { readJsonMutationBody } from '@/server/http/mutation-policy';

import { createPostActivitySubmissionRoute } from './route';

const trustedOrigin = 'https://learn.example.test';
const request = new Request(`${trustedOrigin}/api/v1/learning/activities/submit`, {
  headers: {
    'content-type': 'application/json',
    origin: trustedOrigin,
    'sec-fetch-site': 'same-origin',
  },
  method: 'POST',
});

const activityInput = {
  activityId: 'ja-n5-l01-vocabulary',
  contentReleaseId: 'ja-n5-pilot-v1',
  deviceId: '123e4567-e89b-42d3-a456-426614174001',
  deviceSequence: 7,
  idempotencyKey: '123e4567-e89b-42d3-a456-426614174002',
  responsePayload: { acknowledged: true },
  reviewedAtClient: '2026-07-29T00:00:00.000Z',
  timezone: 'Asia/Ho_Chi_Minh',
} as const;

const activityReceipt = {
  attemptId: '123e4567-e89b-42d3-a456-426614174004',
  completedActivityCount: 1,
  completionState: 'completed',
  idempotentReplay: false,
  lessonId: 'ja-n5-l01',
  progressState: 'completed',
  totalActivityCount: 1,
} as const;

const authenticatedRequest = (
  source: AuthenticatedSupabaseRequest['source'] = 'cookie',
): AuthenticatedSupabaseRequest => ({
  client: {} as AuthenticatedSupabaseRequest['client'],
  responseHeaders: new Headers({ 'x-supabase-refresh': 'applied' }),
  source,
  user: { id: 'learner-1' } as AuthenticatedSupabaseRequest['user'],
});

describe('POST /api/v1/learning/activities/submit', () => {
  it('binds the verified learner and returns the activity receipt with no-store headers', async () => {
    const submitActivity = vi.fn(async () => activityReceipt);
    const route = createPostActivitySubmissionRoute({
      authenticate: async () => authenticatedRequest('bearer'),
      readBody: async (_request, options) => {
        expect(options).toEqual({
          authenticationSource: 'bearer',
          trustedOrigin,
        });
        return activityInput;
      },
      readTrustedOrigin: () => trustedOrigin,
      submitActivity,
    });

    const response = await route(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(activityReceipt);
    expect(submitActivity).toHaveBeenCalledWith({
      input: activityInput,
      userId: 'learner-1',
    });
    expect(response.headers.get('x-supabase-refresh')).toBe('applied');
    expect(response.headers.get('cache-control')).toContain('no-store');
  });

  it('rejects malformed activity bodies before the database boundary', async () => {
    const submitActivity = vi.fn(async () => activityReceipt);
    const route = createPostActivitySubmissionRoute({
      authenticate: async () => authenticatedRequest(),
      readBody: async () => ({ ...activityInput, responsePayload: ['forged'] }),
      readTrustedOrigin: () => trustedOrigin,
      submitActivity,
    });

    const response = await route(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: 'INVALID_REQUEST' });
    expect(submitActivity).not.toHaveBeenCalled();
  });

  it('does not expose evaluator failures to the learner', async () => {
    const submitActivity = vi.fn(async () => {
      throw new Error('answer key must not leak');
    });
    const route = createPostActivitySubmissionRoute({
      authenticate: async () => authenticatedRequest(),
      readBody: async () => activityInput,
      readTrustedOrigin: () => trustedOrigin,
      submitActivity,
    });

    const response = await route(request);
    const body = (await response.json()) as { message: string };

    expect(response.status).toBe(503);
    expect(body.message).not.toContain('answer key');
    expect(body.message).toBe('Dịch vụ tạm thời chưa sẵn sàng. Vui lòng thử lại.');
  });

  it('accepts a bearer mutation without browser Origin headers', async () => {
    const submitActivity = vi.fn(async () => activityReceipt);
    const route = createPostActivitySubmissionRoute({
      authenticate: async () => authenticatedRequest('bearer'),
      readBody: readJsonMutationBody,
      readTrustedOrigin: () => trustedOrigin,
      submitActivity,
    });
    const bearerRequest = new Request(request.url, {
      body: JSON.stringify(activityInput),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });

    const response = await route(bearerRequest);

    expect(response.status).toBe(200);
    expect(submitActivity).toHaveBeenCalledOnce();
  });

  it('rejects a cookie mutation without an Origin before repository access', async () => {
    const submitActivity = vi.fn(async () => activityReceipt);
    const route = createPostActivitySubmissionRoute({
      authenticate: async () => authenticatedRequest('cookie'),
      readBody: readJsonMutationBody,
      readTrustedOrigin: () => trustedOrigin,
      submitActivity,
    });
    const cookieRequest = new Request(request.url, {
      body: JSON.stringify(activityInput),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });

    const response = await route(cookieRequest);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ code: 'FORBIDDEN' });
    expect(submitActivity).not.toHaveBeenCalled();
  });
});
