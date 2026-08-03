import { describe, expect, it } from 'vitest';

import {
  RequestAuthenticationError,
  type AuthenticatedSupabaseRequest,
} from '@/lib/supabase/request-auth';

import { createGetPlacementSessionRoute } from './route-handler';

import type { PlacementSessionReceipt } from '@ideogram/contracts';
import type { SupabaseClient, User } from '@supabase/supabase-js';

const sessionId = '123e4567-e89b-42d3-a456-426614174001';
const receipt: PlacementSessionReceipt = {
  completedAt: null,
  confidence: null,
  placementSessionId: sessionId,
  recommendedLevelCode: null,
  scoredAt: null,
  sessionStatus: 'submitted',
  submittedAt: '2026-08-03T00:00:00.000Z',
};
const authenticated = (): AuthenticatedSupabaseRequest => ({
  client: {} as SupabaseClient,
  responseHeaders: new Headers(),
  source: 'bearer',
  user: { id: 'learner-1' } as User,
});

describe('GET /api/v1/learning/placement/sessions/[sessionId]', () => {
  it('returns the authenticated learner-safe scoring receipt without caching', async () => {
    const getSession = createGetPlacementSessionRoute({
      authenticate: async () => authenticated(),
      read: async () => receipt,
    });
    const response = await getSession(new Request('https://learn.example.test'), {
      params: Promise.resolve({ sessionId }),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(receipt);
    expect(response.headers.get('cache-control')).toContain('no-store');
  });

  it('rejects a malformed route id before reading the session', async () => {
    const response = await createGetPlacementSessionRoute({
      authenticate: async () => authenticated(),
      read: async () => receipt,
    })(new Request('https://learn.example.test'), {
      params: Promise.resolve({ sessionId: 'bad-id' }),
    });
    expect(response.status).toBe(400);
  });

  it('does not expose a session to an unauthenticated caller', async () => {
    const response = await createGetPlacementSessionRoute({
      authenticate: async () => {
        throw new RequestAuthenticationError();
      },
      read: async () => receipt,
    })(new Request('https://learn.example.test'), { params: Promise.resolve({ sessionId }) });
    expect(response.status).toBe(401);
  });
});
