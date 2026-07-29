import { createWebSessionCookieAttributes } from '@ideogram/contracts';

import type { CookieOptions } from '@supabase/ssr';

const defaultCookieMaxAgeSeconds = 60 * 60 * 24 * 365;

export const hardenSessionCookieOptions = (
  options: CookieOptions,
  isProduction = process.env.NODE_ENV === 'production',
): CookieOptions => {
  const attributes = createWebSessionCookieAttributes({
    isProduction,
    maxAgeSeconds: defaultCookieMaxAgeSeconds,
  });

  return {
    ...options,
    httpOnly: attributes.httpOnly,
    maxAge: options.maxAge ?? attributes.maxAgeSeconds,
    path: attributes.path,
    sameSite: attributes.sameSite,
    secure: attributes.secure,
  };
};
