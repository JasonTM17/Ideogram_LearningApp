import { describe, expect, it } from 'vitest';

import {
  createEmailOtpRateLimiter,
  emailOtpRateLimitWindowMs,
  readEmailOtpNetworkIdentity,
} from './email-otp-rate-limit';

describe('email OTP rate limiter', () => {
  it('limits repeated requests for one address and returns a bounded retry window', () => {
    const limiter = createEmailOtpRateLimiter({ perAddressLimit: 2, perNetworkLimit: 10 });
    const firstAttempt = limiter.consume({
      email: 'minh@example.test',
      networkIdentity: '203.0.113.10',
      now: 10_000,
    });
    const secondAttempt = limiter.consume({
      email: 'minh@example.test',
      networkIdentity: '203.0.113.10',
      now: 11_000,
    });
    const blockedAttempt = limiter.consume({
      email: 'minh@example.test',
      networkIdentity: '203.0.113.10',
      now: 12_000,
    });

    expect(firstAttempt).toEqual({ allowed: true });
    expect(secondAttempt).toEqual({ allowed: true });
    expect(blockedAttempt.allowed).toBe(false);
    expect(blockedAttempt.retryAfterSeconds).toBeGreaterThan(0);
    expect(blockedAttempt.retryAfterSeconds).toBeLessThanOrEqual(900);
  });

  it('allows a request again after the sliding window expires', () => {
    const limiter = createEmailOtpRateLimiter({ perAddressLimit: 1, perNetworkLimit: 10 });

    expect(
      limiter.consume({
        email: 'minh@example.test',
        networkIdentity: '203.0.113.10',
        now: 10_000,
      }),
    ).toEqual({ allowed: true });
    expect(
      limiter.consume({
        email: 'minh@example.test',
        networkIdentity: '203.0.113.10',
        now: 10_000 + emailOtpRateLimitWindowMs + 1,
      }),
    ).toEqual({ allowed: true });
  });

  it('limits a noisy network independently from other networks', () => {
    const limiter = createEmailOtpRateLimiter({ perAddressLimit: 10, perNetworkLimit: 2 });

    expect(
      limiter.consume({
        email: 'one@example.test',
        networkIdentity: '203.0.113.10',
        now: 10_000,
      }).allowed,
    ).toBe(true);
    expect(
      limiter.consume({
        email: 'two@example.test',
        networkIdentity: '203.0.113.10',
        now: 11_000,
      }).allowed,
    ).toBe(true);
    expect(
      limiter.consume({
        email: 'three@example.test',
        networkIdentity: '203.0.113.10',
        now: 12_000,
      }).allowed,
    ).toBe(false);
    expect(
      limiter.consume({
        email: 'three@example.test',
        networkIdentity: '203.0.113.11',
        now: 12_000,
      }).allowed,
    ).toBe(true);
  });

  it('prefers the first forwarded address and falls back to a direct proxy header', () => {
    expect(
      readEmailOtpNetworkIdentity(
        new Request('https://learn.example.test', {
          headers: {
            'x-forwarded-for': '203.0.113.10, 10.0.0.1',
            'x-real-ip': '203.0.113.11',
          },
        }),
        true,
      ),
    ).toBe('203.0.113.10');
    expect(
      readEmailOtpNetworkIdentity(
        new Request('https://learn.example.test', {
          headers: { 'x-real-ip': '203.0.113.11' },
        }),
        true,
      ),
    ).toBe('203.0.113.11');
    expect(readEmailOtpNetworkIdentity(new Request('https://learn.example.test'))).toBeUndefined();
    expect(
      readEmailOtpNetworkIdentity(
        new Request('https://learn.example.test', {
          headers: { 'x-forwarded-for': '203.0.113.10' },
        }),
      ),
    ).toBeUndefined();
  });
});
