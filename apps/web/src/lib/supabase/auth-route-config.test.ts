import { describe, expect, it } from 'vitest';

import { readWebAuthRouteConfiguration } from './auth-route-config';

describe('web auth route configuration', () => {
  it('builds the callback URL from the canonical app origin', () => {
    expect(
      readWebAuthRouteConfiguration({
        APP_ORIGIN: 'https://learn.example.test',
        NODE_ENV: 'production',
      }),
    ).toEqual({
      callbackUrl: 'https://learn.example.test/auth/callback',
      isProduction: true,
      trustProxyIpHeaders: false,
      trustedOrigin: 'https://learn.example.test',
    });
  });

  it('permits local HTTP origins outside production', () => {
    expect(
      readWebAuthRouteConfiguration({
        APP_ORIGIN: 'http://127.0.0.1:3000',
        NODE_ENV: 'development',
      }),
    ).toMatchObject({
      callbackUrl: 'http://127.0.0.1:3000/auth/callback',
      trustedOrigin: 'http://127.0.0.1:3000',
    });
  });

  it('trusts proxy IP headers only when explicitly enabled', () => {
    expect(
      readWebAuthRouteConfiguration({
        APP_ORIGIN: 'https://learn.example.test',
        NODE_ENV: 'production',
        TRUST_PROXY_IP_HEADERS: 'true',
      }),
    ).toMatchObject({ trustProxyIpHeaders: true });

    expect(() =>
      readWebAuthRouteConfiguration({
        APP_ORIGIN: 'https://learn.example.test',
        NODE_ENV: 'production',
        TRUST_PROXY_IP_HEADERS: 'yes',
      }),
    ).toThrow(TypeError);
  });
});
