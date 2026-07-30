import { describe, expect, it, vi } from 'vitest';

import { createSignOutRoute } from './sign-out-route';

import type { AuthenticatedSupabaseRequest } from '@/lib/supabase/request-auth';

const trustedOrigin = 'https://learn.example.test';

const createAuthenticatedRequest = ({
  source = 'cookie',
  signOut = vi.fn().mockResolvedValue({ error: null }),
}: {
  source?: AuthenticatedSupabaseRequest['source'];
  signOut?: ReturnType<typeof vi.fn>;
} = {}): AuthenticatedSupabaseRequest => ({
  client: {
    auth: {
      signOut,
    },
  } as unknown as AuthenticatedSupabaseRequest['client'],
  responseHeaders: new Headers({ 'x-supabase-refresh': 'cleared' }),
  source,
  user: { id: 'learner-1' } as AuthenticatedSupabaseRequest['user'],
});

describe('POST /api/v1/auth/sign-out', () => {
  it('requires a verified same-origin cookie session and returns a no-store success envelope', async () => {
    const authenticatedRequest = createAuthenticatedRequest();
    const route = createSignOutRoute({
      authenticate: async () => authenticatedRequest,
      readBody: async () => ({}),
      readConfiguration: () => ({
        callbackUrl: `${trustedOrigin}/auth/callback`,
        isProduction: true,
        trustedOrigin,
      }),
    });

    const response = await route(
      new Request(`${trustedOrigin}/api/v1/auth/sign-out`, {
        headers: {
          'content-type': 'application/json',
          origin: trustedOrigin,
          'sec-fetch-site': 'same-origin',
        },
        method: 'POST',
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ signedOut: true });
    expect(authenticatedRequest.client.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(response.headers.get('x-supabase-refresh')).toBe('cleared');
    expect(response.headers.get('cache-control')).toContain('no-store');
  });

  it('rejects bearer-authenticated sign-out attempts', async () => {
    const authenticatedRequest = createAuthenticatedRequest({ source: 'bearer' });
    const route = createSignOutRoute({
      authenticate: async () => authenticatedRequest,
      readBody: async () => ({}),
      readConfiguration: () => ({
        callbackUrl: `${trustedOrigin}/auth/callback`,
        isProduction: true,
        trustedOrigin,
      }),
    });

    const response = await route(new Request(`${trustedOrigin}/api/v1/auth/sign-out`));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ code: 'FORBIDDEN' });
    expect(authenticatedRequest.client.auth.signOut).not.toHaveBeenCalled();
  });

  it('rejects non-empty JSON bodies', async () => {
    const authenticatedRequest = createAuthenticatedRequest();
    const route = createSignOutRoute({
      authenticate: async () => authenticatedRequest,
      readBody: async () => ({ reason: 'user-click' }),
      readConfiguration: () => ({
        callbackUrl: `${trustedOrigin}/auth/callback`,
        isProduction: true,
        trustedOrigin,
      }),
    });

    const response = await route(new Request(`${trustedOrigin}/api/v1/auth/sign-out`));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: 'INVALID_REQUEST' });
    expect(authenticatedRequest.client.auth.signOut).not.toHaveBeenCalled();
  });
});
