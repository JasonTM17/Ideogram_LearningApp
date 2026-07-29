export const authSessionStatuses = ['active', 'expired', 'refresh_required'] as const;

export type AuthSessionStatus = (typeof authSessionStatuses)[number];

export interface AuthSessionBoundary {
  accessTokenExpiresAt: string;
  sessionId: string;
  userId: string;
}

export interface WebSessionCookieAttributes {
  httpOnly: true;
  maxAgeSeconds: number;
  path: '/';
  sameSite: 'lax';
  secure: boolean;
}

const millisecondsPerSecond = 1_000;

const parseTimestamp = (value: string): number | undefined => {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : undefined;
};

export const getAuthSessionStatus = (
  session: AuthSessionBoundary,
  now = new Date(),
  refreshWindowSeconds = 60,
): AuthSessionStatus => {
  if (!Number.isInteger(refreshWindowSeconds) || refreshWindowSeconds < 0) {
    throw new RangeError('refreshWindowSeconds must be a non-negative integer.');
  }

  const expirationTimestamp = parseTimestamp(session.accessTokenExpiresAt);
  if (expirationTimestamp === undefined || expirationTimestamp <= now.getTime()) {
    return 'expired';
  }

  if (expirationTimestamp - now.getTime() <= refreshWindowSeconds * millisecondsPerSecond) {
    return 'refresh_required';
  }

  return 'active';
};

/**
 * The web application is a same-origin BFF: session cookies are server-only,
 * secure in production, and sent only with same-site navigation or requests.
 */
export const createWebSessionCookieAttributes = ({
  isProduction,
  maxAgeSeconds,
}: {
  isProduction: boolean;
  maxAgeSeconds: number;
}): WebSessionCookieAttributes => {
  if (!Number.isInteger(maxAgeSeconds) || maxAgeSeconds <= 0) {
    throw new RangeError('maxAgeSeconds must be a positive integer.');
  }

  return {
    httpOnly: true,
    maxAgeSeconds,
    path: '/',
    sameSite: 'lax',
    secure: isProduction,
  };
};
