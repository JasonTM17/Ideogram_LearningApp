import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createSupabaseAuthRouteClient } from './auth-server-client';

import type { AuthCookieStore } from './auth-cookie-store';

const { createServerClientMock } = vi.hoisted(() => ({
  createServerClientMock: vi.fn(),
}));

vi.mock('@supabase/ssr', () => ({
  createServerClient: createServerClientMock,
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

vi.mock('./environment', () => ({
  readSupabasePublicConfiguration: () => ({
    publishableKey: 'publishable-test-key',
    url: 'https://example.supabase.co',
  }),
}));

describe('auth server client', () => {
  beforeEach(() => {
    createServerClientMock.mockReset();
    createServerClientMock.mockImplementation((_url, _key, options) => options);
  });

  it('hardens any Supabase session cookies written during route handling', async () => {
    const cookieStore: AuthCookieStore = {
      get: vi.fn(),
      getAll: vi.fn(() => []),
      set: vi.fn(),
    };

    const { pkceFlowIds, responseHeaders } = await createSupabaseAuthRouteClient({
      cookieStore,
    });
    const clientOptions = createServerClientMock.mock.results[0]?.value as {
      auth: {
        experimental: {
          appendPkceFlowIdToRedirects: boolean;
        };
      };
      cookies: {
        setAll: (
          cookiesToSet: Array<{
            name: string;
            options: {
              httpOnly?: boolean;
              path?: string;
              sameSite?: 'lax' | 'none' | 'strict';
              secure?: boolean;
            };
            value: string;
          }>,
          headers: Record<string, string>,
        ) => void;
      };
    };

    clientOptions.cookies.setAll(
      [
        {
          name: 'sb-example-auth-token-flow-0123456789abcdef0123456789abcdef-code-verifier',
          options: {
            httpOnly: false,
            path: '/auth',
            sameSite: 'none',
            secure: false,
          },
          value: 'session-cookie',
        },
      ],
      { 'x-supabase-refresh': 'applied' },
    );

    expect(cookieStore.set).toHaveBeenCalledWith(
      'sb-example-auth-token-flow-0123456789abcdef0123456789abcdef-code-verifier',
      'session-cookie',
      expect.objectContaining({
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
        secure: false,
      }),
    );
    expect(clientOptions.auth.experimental.appendPkceFlowIdToRedirects).toBe(true);
    expect(pkceFlowIds).toEqual(['0123456789abcdef0123456789abcdef']);
    expect(responseHeaders.get('x-supabase-refresh')).toBe('applied');
  });
});
