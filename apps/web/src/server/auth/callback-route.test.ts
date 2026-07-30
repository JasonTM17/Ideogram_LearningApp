import { describe, expect, it, vi } from 'vitest';

import { createAuthCallbackRoute } from './callback-route';

import type { SupabaseAuthRouteClient } from '@/lib/supabase/auth-server-client';
import type { AuthCookieStore } from '@/lib/supabase/auth-cookie-store';

const trustedOrigin = 'https://learn.example.test';

const createCookieStore = (returnTo = '/learn?deck=n5', flowId?: string): AuthCookieStore => ({
  get: vi.fn((name: string) =>
    name === (flowId ? `ideogram_auth_return_to_${flowId}` : 'ideogram_auth_return_to')
      ? { name, value: returnTo }
      : undefined,
  ),
  getAll: vi.fn(() => []),
  set: vi.fn(),
});

const createAuthClient = ({
  cookieStore = createCookieStore(),
  exchangeCodeForSession = vi.fn().mockResolvedValue({ data: {}, error: null }),
}: {
  cookieStore?: AuthCookieStore;
  exchangeCodeForSession?: ReturnType<typeof vi.fn>;
} = {}): SupabaseAuthRouteClient => ({
  client: {
    auth: {
      exchangeCodeForSession,
    },
  } as unknown as SupabaseAuthRouteClient['client'],
  cookieStore,
  pkceFlowIds: [],
  responseHeaders: new Headers({ 'x-supabase-refresh': 'applied' }),
});

describe('GET /auth/callback', () => {
  it('exchanges a PKCE code for a session, clears the return cookie, and redirects safely', async () => {
    const flowId = '0123456789abcdef0123456789abcdef';
    const authClient = createAuthClient({
      cookieStore: createCookieStore('/learn?deck=n5', flowId),
    });
    const route = createAuthCallbackRoute({
      createClient: async () => authClient,
      readConfiguration: () => ({
        callbackUrl: `${trustedOrigin}/auth/callback`,
        isProduction: true,
        trustedOrigin,
      }),
    });

    const response = await route(
      new Request(`${trustedOrigin}/auth/callback?code=magic-link-code&sb_flow_id=${flowId}`),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe(`${trustedOrigin}/learn?deck=n5`);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(response.headers.get('referrer-policy')).toBe('no-referrer');
    expect(response.headers.get('x-supabase-refresh')).toBe('applied');
    expect(authClient.client.auth.exchangeCodeForSession).toHaveBeenCalledWith('magic-link-code', {
      flowId,
    });
    expect(authClient.cookieStore.set).toHaveBeenCalledWith(
      `ideogram_auth_return_to_${flowId}`,
      '',
      expect.objectContaining({ maxAge: 0, path: '/auth/callback' }),
    );
  });

  it('redirects token-bearing callbacks to a recoverable sign-in state before exchange', async () => {
    const authClient = createAuthClient();
    const route = createAuthCallbackRoute({
      createClient: async () => authClient,
      readConfiguration: () => ({
        callbackUrl: `${trustedOrigin}/auth/callback`,
        isProduction: true,
        trustedOrigin,
      }),
    });

    const response = await route(
      new Request(`${trustedOrigin}/auth/callback?access_token=never&code=should-not-run`),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe(
      `${trustedOrigin}/sign-in?reason=bearer_token_in_callback`,
    );
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(response.headers.get('referrer-policy')).toBe('no-referrer');
    expect(authClient.client.auth.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(authClient.cookieStore.set).not.toHaveBeenCalled();
  });

  it('rejects a Unicode-confusable flow identifier before touching cookies', async () => {
    const authClient = createAuthClient();
    const createClient = vi.fn(async () => authClient);
    const route = createAuthCallbackRoute({
      createClient,
      readConfiguration: () => ({
        callbackUrl: `${trustedOrigin}/auth/callback`,
        isProduction: true,
        trustedOrigin,
      }),
    });

    const response = await route(
      new Request(
        `${trustedOrigin}/auth/callback?code=one-time-code&sb_flow_id=${encodeURIComponent('K1234567')}`,
      ),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe(
      `${trustedOrigin}/sign-in?reason=invalid_callback`,
    );
    expect(createClient).not.toHaveBeenCalled();
    expect(authClient.cookieStore.set).not.toHaveBeenCalled();
  });

  it('maps an expired or invalid exchange to a recoverable sign-in state', async () => {
    const authClient = createAuthClient({
      exchangeCodeForSession: vi.fn().mockResolvedValue({
        error: { message: 'invalid flow state', status: 400 },
      }),
    });
    const route = createAuthCallbackRoute({
      createClient: async () => authClient,
      readConfiguration: () => ({
        callbackUrl: `${trustedOrigin}/auth/callback`,
        isProduction: false,
        trustedOrigin,
      }),
    });

    const response = await route(new Request(`${trustedOrigin}/auth/callback?code=expired-code`));

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe(
      `${trustedOrigin}/sign-in?reason=exchange_failed&returnTo=%2Flearn%3Fdeck%3Dn5`,
    );
    expect(response.headers.get('cache-control')).toContain('no-store');
  });

  it('preserves the safe deep link when a transient exchange failure needs a retry', async () => {
    const authClient = createAuthClient({
      exchangeCodeForSession: vi.fn().mockResolvedValue({
        error: { message: 'upstream unavailable', status: 500 },
      }),
    });
    const route = createAuthCallbackRoute({
      createClient: async () => authClient,
      readConfiguration: () => ({
        callbackUrl: `${trustedOrigin}/auth/callback`,
        isProduction: true,
        trustedOrigin,
      }),
    });

    const response = await route(new Request(`${trustedOrigin}/auth/callback?code=valid-code`));

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe(
      `${trustedOrigin}/sign-in?reason=service_unavailable&returnTo=%2Flearn%3Fdeck%3Dn5`,
    );
  });
});
