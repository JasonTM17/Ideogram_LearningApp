import { describe, expect, it } from 'vitest';

import { RequestAuthenticationError } from '@/lib/supabase/request-auth';

import { createGetLearnerCatalogRoute } from './route-handler';

import type { AuthenticatedSupabaseRequest } from '@/lib/supabase/request-auth';
import type { LearnerCatalogResponse } from '@ideogram/contracts';
import type { SupabaseClient, User } from '@supabase/supabase-js';

const request = new Request('https://learn.example.test/api/v1/learning/catalog');
const emptyCatalog: LearnerCatalogResponse = { languagePacks: [] };

const authenticatedRequest = (): AuthenticatedSupabaseRequest => ({
  client: {} as SupabaseClient,
  responseHeaders: new Headers({ 'X-Supabase-Refresh': 'applied' }),
  source: 'bearer',
  user: { id: 'learner-1' } as User,
});

describe('GET /api/v1/learning/catalog', () => {
  it('binds the request to a verified learner and returns only private, uncacheable data', async () => {
    const getCatalog = createGetLearnerCatalogRoute({
      authenticate: async () => authenticatedRequest(),
      readCatalog: async () => emptyCatalog,
    });

    const response = await getCatalog(request);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(emptyCatalog);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(response.headers.get('x-supabase-refresh')).toBe('applied');
    expect(response.headers.get('x-request-id')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u,
    );
  });

  it('returns a typed 401 when session verification rejects the credential', async () => {
    const getCatalog = createGetLearnerCatalogRoute({
      authenticate: async () => {
        throw new RequestAuthenticationError();
      },
      readCatalog: async () => emptyCatalog,
    });

    const response = await getCatalog(request);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('does not leak repository failures to the learner', async () => {
    const getCatalog = createGetLearnerCatalogRoute({
      authenticate: async () => authenticatedRequest(),
      readCatalog: async () => {
        throw new Error('database password should not reach the learner');
      },
    });

    const response = await getCatalog(request);
    const body = (await response.json()) as { message: string };

    expect(response.status).toBe(503);
    expect(body.message).not.toContain('password');
    expect(body.message).toBe('Dịch vụ tạm thời chưa sẵn sàng. Vui lòng thử lại.');
  });
});
