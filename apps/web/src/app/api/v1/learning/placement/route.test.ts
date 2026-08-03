import { describe, expect, it } from 'vitest';

import { RequestAuthenticationError } from '@/lib/supabase/request-auth';

import { createGetPlacementCatalogRoute } from './route';

import type { AuthenticatedSupabaseRequest } from '@/lib/supabase/request-auth';
import type { PlacementCatalogResponse } from '@ideogram/contracts';
import type { SupabaseClient, User } from '@supabase/supabase-js';

const request = new Request('https://learn.example.test/api/v1/learning/placement');
const catalog: PlacementCatalogResponse = { questionSets: [] };
const authenticated = (): AuthenticatedSupabaseRequest => ({
  client: {} as SupabaseClient,
  responseHeaders: new Headers({ 'X-Supabase-Refresh': 'applied' }),
  source: 'bearer',
  user: { id: 'learner-1' } as User,
});

describe('GET /api/v1/learning/placement', () => {
  it('returns an answer-safe published catalog with private no-store headers', async () => {
    const getCatalog = createGetPlacementCatalogRoute({
      authenticate: async () => authenticated(),
      readCatalog: async () => catalog,
    });
    const response = await getCatalog(request);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(catalog);
    expect(response.headers.get('cache-control')).toContain('no-store');
  });

  it('does not turn an unauthenticated request into a catalog response', async () => {
    const getCatalog = createGetPlacementCatalogRoute({
      authenticate: async () => {
        throw new RequestAuthenticationError();
      },
      readCatalog: async () => catalog,
    });
    const response = await getCatalog(request);
    expect(response.status).toBe(401);
  });
});
