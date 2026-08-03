import { describe, expect, it } from 'vitest';

import {
  RequestAuthenticationError,
  type AuthenticatedSupabaseRequest,
} from '@/lib/supabase/request-auth';

import { createGetSessionIdentityRoute } from './route-handler';

import type { SupabaseClient, User } from '@supabase/supabase-js';

const authenticated = (): AuthenticatedSupabaseRequest => ({
  client: {
    auth: {
      getSession: async () => ({
        data: {
          session: {
            access_token: `header.${Buffer.from(
              JSON.stringify({ session_id: 'session-a', sub: 'user-a' }),
            ).toString('base64url')}.signature`,
          },
        },
        error: null,
      }),
    },
  } as unknown as SupabaseClient,
  responseHeaders: new Headers({ 'X-Supabase-Refresh': 'applied' }),
  source: 'cookie',
  user: { id: '123e4567-e89b-42d3-a456-426614174001' } as User,
});

describe('GET /api/v1/auth/session', () => {
  it('returns only the authenticated identity with no-store headers', async () => {
    const response = await createGetSessionIdentityRoute({
      authenticate: async () => authenticated(),
    })(new Request('https://learn.example.test/api/v1/auth/session'));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      sessionEpoch: expect.any(Number),
      userId: authenticated().user.id,
    });
    expect(response.headers.get('cache-control')).toContain('no-store');
  });

  it('does not return an identity for an unauthenticated request', async () => {
    const response = await createGetSessionIdentityRoute({
      authenticate: async () => {
        throw new RequestAuthenticationError();
      },
    })(new Request('https://learn.example.test/api/v1/auth/session'));
    expect(response.status).toBe(401);
  });
});
