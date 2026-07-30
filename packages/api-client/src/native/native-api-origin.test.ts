import { describe, expect, it } from 'vitest';

import { NativeApiConfigurationError } from './native-api-errors';
import { validateNativeApiOrigin } from './native-api-origin';

describe('validateNativeApiOrigin', () => {
  it('returns a canonical HTTPS origin', () => {
    expect(validateNativeApiOrigin('https://API.Example.test:443/')).toBe(
      'https://api.example.test',
    );
    expect(validateNativeApiOrigin('https://api.example.test:8443')).toBe(
      'https://api.example.test:8443',
    );
  });

  it.each([
    'https://@api.example.test',
    'https://user@api.example.test',
    'https://user:password@api.example.test',
    'https://api.example.test/v1',
    'https://api.example.test/v1/..',
    'https://api.example.test/%2e%2e',
    'https://api.example.test?region=one',
    'https://api.example.test#fragment',
    ' https://api.example.test',
    'file:///api',
    'not-an-origin',
  ])('rejects a credentialed or non-origin URL: %s', (origin) => {
    expect(() => validateNativeApiOrigin(origin)).toThrow(NativeApiConfigurationError);
  });

  it('rejects HTTP unless loopback use is explicitly enabled', () => {
    expect(() => validateNativeApiOrigin('http://127.0.0.1:3000')).toThrow(
      NativeApiConfigurationError,
    );
    expect(() =>
      validateNativeApiOrigin('http://api.example.test', { allowHttpLoopback: true }),
    ).toThrow(NativeApiConfigurationError);
  });

  it.each([
    ['http://localhost:3000/', 'http://localhost:3000'],
    ['http://127.0.0.2:3000', 'http://127.0.0.2:3000'],
    ['http://[::1]:3000/', 'http://[::1]:3000'],
  ])('allows opted-in HTTP loopback origin %s', (origin, canonicalOrigin) => {
    expect(validateNativeApiOrigin(origin, { allowHttpLoopback: true })).toBe(canonicalOrigin);
  });
});
