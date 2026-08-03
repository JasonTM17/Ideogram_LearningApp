import { describe, expect, it } from 'vitest';

import { RequestAuthenticationError } from '@/lib/supabase/request-auth';

import { createGetLearnerReviewQueueRoute } from './route-handler';

import type { AuthenticatedSupabaseRequest } from '@/lib/supabase/request-auth';
import type { ReviewQueueResponse } from '@ideogram/contracts';
import type { SupabaseClient, User } from '@supabase/supabase-js';

const request = new Request('https://learn.example.test/api/v1/learning/reviews');
const queue: ReviewQueueResponse = { items: [] };

const authenticatedRequest = (): AuthenticatedSupabaseRequest => ({
  client: {} as SupabaseClient,
  responseHeaders: new Headers({ 'X-Supabase-Refresh': 'applied' }),
  source: 'bearer',
  user: { id: 'learner-1' } as User,
});

describe('GET /api/v1/learning/reviews', () => {
  it('returns only the owned review queue with private no-store headers', async () => {
    const getQueue = createGetLearnerReviewQueueRoute({
      authenticate: async () => authenticatedRequest(),
      readReviewQueue: async () => queue,
    });

    const response = await getQueue(request);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(queue);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(response.headers.get('x-supabase-refresh')).toBe('applied');
  });

  it('returns a typed 401 when review queue authentication fails', async () => {
    const getQueue = createGetLearnerReviewQueueRoute({
      authenticate: async () => {
        throw new RequestAuthenticationError();
      },
      readReviewQueue: async () => queue,
    });

    const response = await getQueue(request);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('does not leak queue repository details', async () => {
    const getQueue = createGetLearnerReviewQueueRoute({
      authenticate: async () => authenticatedRequest(),
      readReviewQueue: async () => {
        throw new Error('database password should not reach a learner');
      },
    });

    const response = await getQueue(request);
    const body = (await response.json()) as { message: string };

    expect(response.status).toBe(503);
    expect(body.message).not.toContain('password');
  });
});
