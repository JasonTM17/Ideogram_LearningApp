import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { readSupabasePublicConfiguration } from './environment';
import { hardenSessionCookieOptions } from './session-cookie';

import type { AuthCookieStore } from './auth-cookie-store';
import type { SupabaseClient } from '@supabase/supabase-js';

const pkceVerifierCookieNamePattern = /-flow-([a-z0-9_-]{8,64})-code-verifier(?:\.\d+)?$/iu;

export interface SupabaseAuthRouteClient {
  client: SupabaseClient;
  cookieStore: AuthCookieStore;
  pkceFlowIds: readonly string[];
  responseHeaders: Headers;
}

export const createSupabaseAuthRouteClient = async ({
  cookieStore,
  responseHeaders = new Headers(),
}: {
  cookieStore?: AuthCookieStore;
  responseHeaders?: Headers;
} = {}): Promise<SupabaseAuthRouteClient> => {
  const resolvedCookieStore = cookieStore ?? ((await cookies()) as AuthCookieStore);
  const configuration = readSupabasePublicConfiguration();
  const pkceFlowIds: string[] = [];

  return {
    client: createServerClient(configuration.url, configuration.publishableKey, {
      auth: {
        experimental: {
          appendPkceFlowIdToRedirects: true,
        },
      },
      cookies: {
        encode: 'tokens-only',
        getAll: () => resolvedCookieStore.getAll(),
        setAll: (cookiesToSet, headers) => {
          for (const { name, options, value } of cookiesToSet) {
            const flowId = pkceVerifierCookieNamePattern.exec(name)?.[1];
            if (flowId && !pkceFlowIds.includes(flowId)) {
              pkceFlowIds.push(flowId);
            }

            resolvedCookieStore.set(name, value, hardenSessionCookieOptions(options));
          }

          for (const [name, value] of Object.entries(headers)) {
            responseHeaders.set(name, value);
          }
        },
      },
    }),
    cookieStore: resolvedCookieStore,
    pkceFlowIds,
    responseHeaders,
  };
};
