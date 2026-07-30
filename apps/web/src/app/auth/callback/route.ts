import { createAuthCallbackRoute } from '@/server/auth/callback-route';

export const runtime = 'nodejs';

export const GET = createAuthCallbackRoute();
