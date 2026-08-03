import { describe, expect, it, vi } from 'vitest';

import type { AuthenticatedSupabaseRequest } from '@/lib/supabase/request-auth';
import { readJsonMutationBody } from '@/server/http/mutation-policy';

import { createPostReviewSubmissionRoute } from './route-handler';

const trustedOrigin = 'https://learn.example.test';
const request = new Request(`${trustedOrigin}/api/v1/learning/reviews/submit`, {
  headers: {
    'content-type': 'application/json',
    origin: trustedOrigin,
    'sec-fetch-site': 'same-origin',
  },
  method: 'POST',
});

const reviewInput = {
  deviceId: '123e4567-e89b-42d3-a456-426614174001',
  deviceSequence: 7,
  grade: 'good',
  idempotencyKey: '123e4567-e89b-42d3-a456-426614174002',
  itemId: '123e4567-e89b-42d3-a456-426614174003',
  reviewedAtClient: '2026-07-29T00:00:00.000Z',
  timezone: 'Asia/Ho_Chi_Minh',
} as const;

const reviewReceipt = {
  eventId: '123e4567-e89b-42d3-a456-426614174004',
  idempotentReplay: false,
  schedule: {
    algorithmVersion: 'srs-v1',
    dueAt: '2026-07-30T00:00:00.000Z',
    easeFactor: 2.55,
    intervalMinutes: 1440,
    lapseCount: 0,
    repetitionCount: 1,
    state: 'review',
  },
  serverReceiptSequence: 8,
} as const;

const authenticatedRequest = (
  source: AuthenticatedSupabaseRequest['source'] = 'cookie',
): AuthenticatedSupabaseRequest => ({
  client: {} as AuthenticatedSupabaseRequest['client'],
  responseHeaders: new Headers({ 'x-supabase-refresh': 'applied' }),
  source,
  user: { id: 'learner-1' } as AuthenticatedSupabaseRequest['user'],
});

describe('POST /api/v1/learning/reviews/submit', () => {
  it('binds the verified learner and returns the review receipt with no-store headers', async () => {
    const submitReview = vi.fn(async () => reviewReceipt);
    const route = createPostReviewSubmissionRoute({
      authenticate: async () => authenticatedRequest('bearer'),
      readBody: async (_request, options) => {
        expect(options).toEqual({
          authenticationSource: 'bearer',
          trustedOrigin,
        });
        return reviewInput;
      },
      readTrustedOrigin: () => trustedOrigin,
      submitReview,
    });

    const response = await route(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(reviewReceipt);
    expect(submitReview).toHaveBeenCalledWith({
      input: reviewInput,
      userId: 'learner-1',
    });
    expect(response.headers.get('x-supabase-refresh')).toBe('applied');
    expect(response.headers.get('cache-control')).toContain('no-store');
  });

  it('rejects malformed review bodies before the database boundary', async () => {
    const submitReview = vi.fn(async () => reviewReceipt);
    const route = createPostReviewSubmissionRoute({
      authenticate: async () => authenticatedRequest(),
      readBody: async () => ({ ...reviewInput, deviceSequence: 0 }),
      readTrustedOrigin: () => trustedOrigin,
      submitReview,
    });

    const response = await route(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: 'INVALID_REQUEST' });
    expect(submitReview).not.toHaveBeenCalled();
  });

  it('does not expose repository failures to the learner', async () => {
    const submitReview = vi.fn(async () => {
      throw new Error('database password should not leak');
    });
    const route = createPostReviewSubmissionRoute({
      authenticate: async () => authenticatedRequest(),
      readBody: async () => reviewInput,
      readTrustedOrigin: () => trustedOrigin,
      submitReview,
    });

    const response = await route(request);
    const body = (await response.json()) as { message: string };

    expect(response.status).toBe(503);
    expect(body.message).not.toContain('password');
    expect(body.message).toBe('Dịch vụ tạm thời chưa sẵn sàng. Vui lòng thử lại.');
  });

  it('accepts a bearer mutation without browser Origin headers', async () => {
    const submitReview = vi.fn(async () => reviewReceipt);
    const route = createPostReviewSubmissionRoute({
      authenticate: async () => authenticatedRequest('bearer'),
      readBody: readJsonMutationBody,
      readTrustedOrigin: () => trustedOrigin,
      submitReview,
    });
    const bearerRequest = new Request(request.url, {
      body: JSON.stringify(reviewInput),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });

    const response = await route(bearerRequest);

    expect(response.status).toBe(200);
    expect(submitReview).toHaveBeenCalledOnce();
  });

  it('rejects a cookie mutation without an Origin before repository access', async () => {
    const submitReview = vi.fn(async () => reviewReceipt);
    const route = createPostReviewSubmissionRoute({
      authenticate: async () => authenticatedRequest('cookie'),
      readBody: readJsonMutationBody,
      readTrustedOrigin: () => trustedOrigin,
      submitReview,
    });
    const cookieRequest = new Request(request.url, {
      body: JSON.stringify(reviewInput),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });

    const response = await route(cookieRequest);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ code: 'FORBIDDEN' });
    expect(submitReview).not.toHaveBeenCalled();
  });
});
