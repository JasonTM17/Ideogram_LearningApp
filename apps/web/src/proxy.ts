import { refreshSupabaseSession } from '@/lib/supabase/proxy-session';

import type { NextRequest } from 'next/server';

export const proxy = async (request: NextRequest) => refreshSupabaseSession(request);

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2)$).*)',
  ],
};
