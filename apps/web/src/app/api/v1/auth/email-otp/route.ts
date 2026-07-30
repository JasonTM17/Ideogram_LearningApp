import { createEmailOtpRoute } from '@/server/auth/email-otp-route';

export const runtime = 'nodejs';

export const POST = createEmailOtpRoute();
