import { parseTrustedWebOrigin } from '@/server/http/mutation-policy';

export interface WebAuthRouteConfiguration {
  callbackUrl: string;
  isProduction: boolean;
  trustProxyIpHeaders?: boolean;
  trustedOrigin: string;
}

export const readWebAuthRouteConfiguration = (
  environment: Readonly<Record<string, string | undefined>> = process.env,
): WebAuthRouteConfiguration => {
  const isProduction = environment.NODE_ENV === 'production';
  const trustedOrigin = parseTrustedWebOrigin(environment.APP_ORIGIN, {
    allowLocalHttp: !isProduction,
  });
  const trustProxyValue = environment.TRUST_PROXY_IP_HEADERS?.trim() || 'false';
  if (trustProxyValue !== 'true' && trustProxyValue !== 'false') {
    throw new TypeError('TRUST_PROXY_IP_HEADERS must be true or false.');
  }

  return {
    callbackUrl: new URL('/auth/callback', trustedOrigin).toString(),
    isProduction,
    trustProxyIpHeaders: trustProxyValue === 'true',
    trustedOrigin,
  };
};
