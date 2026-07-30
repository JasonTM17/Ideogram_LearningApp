import { createHash } from 'node:crypto';
import { isIP } from 'node:net';

export const emailOtpRateLimitWindowMs = 15 * 60 * 1_000;
export const emailOtpPerAddressLimit = 5;
export const emailOtpPerNetworkLimit = 30;
export const emailOtpRateLimitMaximumBuckets = 10_000;

interface RateLimitBucket {
  attempts: number[];
}

export interface EmailOtpRateLimitInput {
  email: string;
  networkIdentity?: string | undefined;
  now?: number;
}

export interface EmailOtpRateLimitDecision {
  allowed: boolean;
  retryAfterSeconds?: number;
}

export interface EmailOtpRateLimiter {
  consume: (input: EmailOtpRateLimitInput) => EmailOtpRateLimitDecision;
}

interface EmailOtpRateLimiterOptions {
  maximumBuckets?: number;
  perAddressLimit?: number;
  perNetworkLimit?: number;
  windowMs?: number;
}

const hashRateLimitKey = (value: string): string =>
  createHash('sha256').update(value).digest('hex').slice(0, 32);

const normalizeNetworkIdentity = (value: string | undefined): string | undefined => {
  const normalized = value?.trim();
  return normalized && normalized.length <= 128 && isIP(normalized) > 0 ? normalized : undefined;
};

const getRetryAfterSeconds = (attempts: number[], now: number, windowMs: number): number => {
  const oldestAttempt = attempts[0];
  if (oldestAttempt === undefined) {
    return 1;
  }

  return Math.max(1, Math.ceil((oldestAttempt + windowMs - now) / 1_000));
};

export const createEmailOtpRateLimiter = ({
  maximumBuckets = emailOtpRateLimitMaximumBuckets,
  perAddressLimit = emailOtpPerAddressLimit,
  perNetworkLimit = emailOtpPerNetworkLimit,
  windowMs = emailOtpRateLimitWindowMs,
}: EmailOtpRateLimiterOptions = {}): EmailOtpRateLimiter => {
  const buckets = new Map<string, RateLimitBucket>();

  const readFreshAttempts = (key: string, now: number): number[] => {
    const bucket = buckets.get(key);
    if (!bucket) {
      return [];
    }

    const freshAttempts = bucket.attempts.filter((attempt) => attempt > now - windowMs);
    if (freshAttempts.length === 0) {
      buckets.delete(key);
      return [];
    }

    bucket.attempts = freshAttempts;
    return freshAttempts;
  };

  const appendAttempt = (key: string, now: number, maximumAttempts: number): void => {
    if (!buckets.has(key) && buckets.size >= maximumBuckets) {
      const oldestKey = buckets.keys().next().value;
      if (oldestKey) {
        buckets.delete(oldestKey);
      }
    }

    const attempts = readFreshAttempts(key, now);
    buckets.set(key, {
      // Keep the oldest entries so retry-after remains conservative under a flood.
      attempts: [...attempts, now].slice(0, maximumAttempts + 1),
    });
  };

  return {
    consume: ({ email, networkIdentity, now = Date.now() }) => {
      const addressKey = `email:${hashRateLimitKey(email)}`;
      const normalizedNetworkIdentity = normalizeNetworkIdentity(networkIdentity);
      const networkKey = normalizedNetworkIdentity
        ? `network:${hashRateLimitKey(normalizedNetworkIdentity)}`
        : undefined;
      const addressAttempts = readFreshAttempts(addressKey, now);
      const networkAttempts = networkKey ? readFreshAttempts(networkKey, now) : [];
      const addressAllowed = addressAttempts.length < perAddressLimit;
      const networkAllowed = !networkKey || networkAttempts.length < perNetworkLimit;

      appendAttempt(addressKey, now, perAddressLimit);
      if (networkKey) {
        appendAttempt(networkKey, now, perNetworkLimit);
      }

      if (addressAllowed && networkAllowed) {
        return { allowed: true };
      }

      return {
        allowed: false,
        retryAfterSeconds: Math.max(
          addressAllowed ? 0 : getRetryAfterSeconds(addressAttempts, now, windowMs),
          networkAllowed ? 0 : getRetryAfterSeconds(networkAttempts, now, windowMs),
        ),
      };
    },
  };
};

export const defaultEmailOtpRateLimiter = createEmailOtpRateLimiter();

/**
 * These headers are only trustworthy when the production ingress overwrites
 * them. Without one, the limiter intentionally skips the shared network bucket
 * instead of collapsing every direct client into a single denial bucket.
 */
export const readEmailOtpNetworkIdentity = (
  request: Request,
  trustProxyIpHeaders = false,
): string | undefined => {
  if (!trustProxyIpHeaders) {
    return undefined;
  }

  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const realIp = request.headers.get('x-real-ip')?.trim();
  return forwardedFor || realIp || undefined;
};
