import { describe, expect, it, vi } from 'vitest';

import { createEmailOtpRoute } from './email-otp-route';

import type { SupabaseAuthRouteClient } from '@/lib/supabase/auth-server-client';
import type { AuthCookieStore } from '@/lib/supabase/auth-cookie-store';

const trustedOrigin = 'https://learn.example.test';

const createCookieStore = (): AuthCookieStore => ({
  get: vi.fn(),
  getAll: vi.fn(() => []),
  set: vi.fn(),
});

const createAuthClient = ({
  cookieStore = createCookieStore(),
  pkceFlowIds = [],
  signInWithOtp = vi.fn().mockResolvedValue({ data: {}, error: null }),
}: {
  cookieStore?: AuthCookieStore;
  pkceFlowIds?: readonly string[];
  signInWithOtp?: ReturnType<typeof vi.fn>;
} = {}): SupabaseAuthRouteClient => ({
  client: {
    auth: {
      signInWithOtp,
    },
  } as unknown as SupabaseAuthRouteClient['client'],
  cookieStore,
  pkceFlowIds,
  responseHeaders: new Headers({ 'x-supabase-refresh': 'applied' }),
});

describe('POST /api/v1/auth/email-otp', () => {
  it('requests an invite-only OTP with a server-built callback URL and stores a safe return cookie', async () => {
    const authClient = createAuthClient();
    const route = createEmailOtpRoute({
      createClient: async () => authClient,
      readBody: async () => ({
        email: ' Minh@example.test ',
        returnTo: '/learn?deck=n5',
      }),
      readConfiguration: () => ({
        callbackUrl: `${trustedOrigin}/auth/callback`,
        isProduction: true,
        trustedOrigin,
      }),
    });

    const response = await route(
      new Request(`${trustedOrigin}/api/v1/auth/email-otp`, {
        headers: {
          'content-type': 'application/json',
          origin: trustedOrigin,
          'sec-fetch-site': 'same-origin',
        },
        method: 'POST',
      }),
    );

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({
      accepted: true,
      message: 'Nếu email hợp lệ và đã được phê duyệt, chúng tôi sẽ gửi liên kết đăng nhập.',
    });
    expect(authClient.client.auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'minh@example.test',
      options: {
        emailRedirectTo: `${trustedOrigin}/auth/callback`,
        shouldCreateUser: false,
      },
    });
    expect(authClient.cookieStore.set).toHaveBeenCalledWith(
      'ideogram_auth_return_to',
      '/learn?deck=n5',
      expect.objectContaining({
        httpOnly: true,
        maxAge: 900,
        path: '/auth/callback',
        sameSite: 'lax',
        secure: true,
      }),
    );
    expect(response.headers.get('x-supabase-refresh')).toBe('applied');
    expect(response.headers.get('cache-control')).toContain('no-store');
  });

  it('keeps the response generic when Supabase hides whether the email can sign in', async () => {
    const authClient = createAuthClient({
      signInWithOtp: vi.fn().mockResolvedValue({
        error: { code: 'user_not_found', message: 'User not found', status: 400 },
      }),
    });
    const route = createEmailOtpRoute({
      createClient: async () => authClient,
      readBody: async () => ({ email: 'minh@example.test', returnTo: '/today' }),
      readConfiguration: () => ({
        callbackUrl: `${trustedOrigin}/auth/callback`,
        isProduction: false,
        trustedOrigin,
      }),
    });

    const response = await route(new Request(`${trustedOrigin}/api/v1/auth/email-otp`));

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toMatchObject({ accepted: true });
  });

  it('binds a return target to the PKCE flow emitted for the email link', async () => {
    const flowId = '0123456789abcdef0123456789abcdef';
    const authClient = createAuthClient({ pkceFlowIds: [flowId] });
    const route = createEmailOtpRoute({
      createClient: async () => authClient,
      readBody: async () => ({ email: 'minh@example.test', returnTo: '/lessons/ja-n5-intro' }),
      readConfiguration: () => ({
        callbackUrl: `${trustedOrigin}/auth/callback`,
        isProduction: true,
        trustedOrigin,
      }),
    });

    const response = await route(new Request(`${trustedOrigin}/api/v1/auth/email-otp`));

    expect(response.status).toBe(202);
    expect(authClient.cookieStore.set).toHaveBeenCalledWith(
      `ideogram_auth_return_to_${flowId}`,
      '/lessons/ja-n5-intro',
      expect.objectContaining({ httpOnly: true, path: '/auth/callback' }),
    );
  });

  it('surfaces a provider-wide OTP configuration outage without logging an email address', async () => {
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const authClient = createAuthClient({
      signInWithOtp: vi.fn().mockResolvedValue({
        error: {
          code: 'otp_disabled',
          message: 'OTP sign-in is disabled',
          status: 422,
        },
      }),
    });
    const route = createEmailOtpRoute({
      createClient: async () => authClient,
      readBody: async () => ({ email: 'minh@example.test', returnTo: '/today' }),
      readConfiguration: () => ({
        callbackUrl: `${trustedOrigin}/auth/callback`,
        isProduction: true,
        trustedOrigin,
      }),
    });

    const response = await route(new Request(`${trustedOrigin}/api/v1/auth/email-otp`));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ code: 'UNAVAILABLE' });
    expect(errorLog).toHaveBeenCalledWith(
      'Supabase email OTP is unavailable due to provider configuration.',
      {
        code: 'otp_disabled',
        status: 422,
      },
    );
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain('minh@example.test');
    errorLog.mockRestore();
  });

  it('stops a locally rate-limited request before contacting Supabase', async () => {
    const authClient = createAuthClient();
    const route = createEmailOtpRoute({
      createClient: async () => authClient,
      readBody: async () => ({ email: 'minh@example.test', returnTo: '/today' }),
      readConfiguration: () => ({
        callbackUrl: `${trustedOrigin}/auth/callback`,
        isProduction: false,
        trustedOrigin,
      }),
      rateLimiter: {
        consume: () => ({ allowed: false, retryAfterSeconds: 120 }),
      },
    });

    const response = await route(new Request(`${trustedOrigin}/api/v1/auth/email-otp`));

    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('120');
    await expect(response.json()).resolves.toMatchObject({ code: 'RATE_LIMITED' });
    expect(authClient.client.auth.signInWithOtp).not.toHaveBeenCalled();
  });

  it('rejects unsafe return targets before contacting Supabase', async () => {
    const authClient = createAuthClient();
    const route = createEmailOtpRoute({
      createClient: async () => authClient,
      readBody: async () => ({ email: 'minh@example.test', returnTo: 'https://attacker.example' }),
      readConfiguration: () => ({
        callbackUrl: `${trustedOrigin}/auth/callback`,
        isProduction: true,
        trustedOrigin,
      }),
    });

    const response = await route(new Request(`${trustedOrigin}/api/v1/auth/email-otp`));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: 'INVALID_REQUEST' });
    expect(authClient.client.auth.signInWithOtp).not.toHaveBeenCalled();
  });
});
