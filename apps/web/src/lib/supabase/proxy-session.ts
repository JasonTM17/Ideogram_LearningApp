import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

import { readSupabasePublicConfiguration } from './environment';
import { hardenSessionCookieOptions } from './session-cookie';

import type { NextRequest } from 'next/server';

export const refreshSupabaseSession = async (request: NextRequest): Promise<NextResponse> => {
  const configuration = readSupabasePublicConfiguration();
  let response = NextResponse.next({ request });

  const client = createServerClient(configuration.url, configuration.publishableKey, {
    cookies: {
      encode: 'tokens-only',
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, responseHeaders) => {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }

        response = NextResponse.next({ request });

        for (const { name, options, value } of cookiesToSet) {
          response.cookies.set(name, value, hardenSessionCookieOptions(options));
        }

        for (const [name, value] of Object.entries(responseHeaders)) {
          response.headers.set(name, value);
        }
      },
    },
  });

  await client.auth.getClaims();

  return response;
};
