import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

import { readSupabasePublicConfiguration } from './environment';
import { hardenSessionCookieOptions } from './session-cookie';
import { ApiHttpError } from '@/server/http/api-response';

import type { SupabaseClient, User } from '@supabase/supabase-js';

export type RequestAuthenticationSource = 'bearer' | 'cookie';

export interface AuthenticatedSupabaseRequest {
  client: SupabaseClient;
  responseHeaders: Headers;
  source: RequestAuthenticationSource;
  user: User;
}

export class RequestAuthenticationError extends ApiHttpError {
  constructor() {
    super({
      code: 'UNAUTHORIZED',
      message: 'Bạn cần đăng nhập để tiếp tục.',
      status: 401,
    });
    this.name = 'RequestAuthenticationError';
  }
}

export class AuthenticationServiceError extends ApiHttpError {
  constructor() {
    super({
      code: 'UNAVAILABLE',
      message: 'Dịch vụ xác thực tạm thời chưa sẵn sàng. Vui lòng thử lại.',
      status: 503,
    });
    this.name = 'AuthenticationServiceError';
  }
}

const bearerPattern = /^Bearer ([A-Za-z0-9._~-]+)$/u;

export const readBearerToken = (request: Request): string | null => {
  const authorization = request.headers.get('authorization');
  if (authorization === null) {
    return null;
  }

  const match = bearerPattern.exec(authorization);
  const token = match?.[1];

  if (!token || token.length > 8192) {
    throw new RequestAuthenticationError();
  }

  return token;
};

const createBearerClient = (token: string): SupabaseClient => {
  const configuration = readSupabasePublicConfiguration();

  return createClient(configuration.url, configuration.publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
};

const createCookieClient = async (responseHeaders: Headers): Promise<SupabaseClient> => {
  const configuration = readSupabasePublicConfiguration();
  const cookieStore = await cookies();

  return createServerClient(configuration.url, configuration.publishableKey, {
    cookies: {
      encode: 'tokens-only',
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet, headers) => {
        for (const { name, options, value } of cookiesToSet) {
          cookieStore.set(name, value, hardenSessionCookieOptions(options));
        }

        for (const [name, value] of Object.entries(headers)) {
          responseHeaders.set(name, value);
        }
      },
    },
  });
};

const hasExpectedAuthenticationStatus = (error: unknown): boolean => {
  if (!error || typeof error !== 'object' || !('status' in error)) {
    return false;
  }

  const status = error.status;
  return status === 400 || status === 401 || status === 403;
};

export const requireAuthenticatedUser = (user: User | null, error: unknown): User => {
  if (user) {
    return user;
  }

  if (!error || hasExpectedAuthenticationStatus(error)) {
    throw new RequestAuthenticationError();
  }

  throw new AuthenticationServiceError();
};

export const authenticateSupabaseRequest = async (
  request: Request,
): Promise<AuthenticatedSupabaseRequest> => {
  const token = readBearerToken(request);
  const responseHeaders = new Headers();
  const client = token ? createBearerClient(token) : await createCookieClient(responseHeaders);
  const { data, error } = await client.auth.getUser(token ?? undefined);

  return {
    client,
    responseHeaders,
    source: token ? 'bearer' : 'cookie',
    user: requireAuthenticatedUser(data.user, error),
  };
};
