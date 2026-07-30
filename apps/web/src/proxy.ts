import { NextResponse } from 'next/server';

import { refreshSupabaseSession } from '@/lib/supabase/proxy-session';

import type { NextRequest } from 'next/server';

const sessionIndependentPaths = new Set([
  '/',
  '/api/v1/auth/email-otp',
  '/api/v1/health',
  '/auth/callback',
  '/sign-in',
]);

export const shouldRefreshSupabaseSession = (pathname: string): boolean =>
  !sessionIndependentPaths.has(pathname);

export const proxy = async (request: NextRequest) => {
  if (!shouldRefreshSupabaseSession(request.nextUrl.pathname)) {
    return NextResponse.next({ request });
  }

  return refreshSupabaseSession(request);
};

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2)$).*)',
  ],
};
