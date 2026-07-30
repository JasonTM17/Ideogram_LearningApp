import { NativeApiConfigurationError } from './native-api-errors';

export interface NativeApiOriginOptions {
  /**
   * Allows plain HTTP only for localhost, IPv4 loopback, or IPv6 loopback.
   * Production and non-loopback origins must always use HTTPS.
   */
  allowHttpLoopback?: boolean;
}

const isIpv4Loopback = (hostname: string): boolean => {
  const octets = hostname.split('.');
  return (
    octets.length === 4 &&
    octets[0] === '127' &&
    octets.every((octet) => /^\d{1,3}$/u.test(octet) && Number(octet) <= 255)
  );
};

const isLoopbackHostname = (hostname: string): boolean =>
  hostname === 'localhost' || hostname === '[::1]' || isIpv4Loopback(hostname);

const originOnlyPattern = /^https?:\/\/[^@/?#\\]+\/?$/u;

/**
 * Validates an API origin and returns the URL parser's canonical origin.
 * Root trailing slashes are accepted, while paths, credentials, queries, and
 * fragments are rejected.
 */
export const validateNativeApiOrigin = (
  input: string,
  options: NativeApiOriginOptions = {},
): string => {
  if (
    typeof input !== 'string' ||
    input.length === 0 ||
    input.trim() !== input ||
    input.includes('?') ||
    input.includes('#') ||
    !originOnlyPattern.test(input)
  ) {
    throw new NativeApiConfigurationError();
  }

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new NativeApiConfigurationError();
  }

  if (
    url.origin === 'null' ||
    url.username.length > 0 ||
    url.password.length > 0 ||
    url.pathname !== '/' ||
    url.search.length > 0 ||
    url.hash.length > 0
  ) {
    throw new NativeApiConfigurationError();
  }

  if (url.protocol === 'https:') {
    return url.origin;
  }

  if (
    url.protocol === 'http:' &&
    options.allowHttpLoopback === true &&
    isLoopbackHostname(url.hostname)
  ) {
    return url.origin;
  }

  throw new NativeApiConfigurationError();
};
