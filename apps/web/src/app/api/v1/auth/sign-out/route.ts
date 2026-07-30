import { createSignOutRoute } from '@/server/auth/sign-out-route';

export const runtime = 'nodejs';

export const POST = createSignOutRoute();
