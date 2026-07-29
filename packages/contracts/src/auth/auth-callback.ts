export const authCallbackFailureReasons = [
  'authorization_denied',
  'bearer_token_in_callback',
  'invalid_callback',
  'missing_code',
  'missing_state',
] as const;

export type AuthCallbackFailureReason = (typeof authCallbackFailureReasons)[number];

export interface AuthorizationCodeCallback {
  code: string;
  redirectUri: string;
  state: string;
}

export type AuthorizationCodeCallbackParseResult =
  | {
      callback: AuthorizationCodeCallback;
      status: 'ok';
    }
  | {
      reason: AuthCallbackFailureReason;
      status: 'error';
    };

const bearerTokenFields = new Set(['access_token', 'id_token', 'refresh_token', 'token']);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readNonEmptyString = (record: Record<string, unknown>, key: string): string | undefined => {
  const value = record[key];

  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

/**
 * Parses only authorization-code callbacks. Token-bearing implicit callbacks are
 * explicitly rejected so tokens can never enter browser history, deep-link logs,
 * or application telemetry through this contract.
 */
export const parseAuthorizationCodeCallback = (
  value: unknown,
): AuthorizationCodeCallbackParseResult => {
  if (!isRecord(value)) {
    return { reason: 'invalid_callback', status: 'error' };
  }

  if ([...bearerTokenFields].some((field) => field in value)) {
    return { reason: 'bearer_token_in_callback', status: 'error' };
  }

  if (readNonEmptyString(value, 'error')) {
    return { reason: 'authorization_denied', status: 'error' };
  }

  const code = readNonEmptyString(value, 'code');
  if (!code) {
    return { reason: 'missing_code', status: 'error' };
  }

  const state = readNonEmptyString(value, 'state');
  if (!state) {
    return { reason: 'missing_state', status: 'error' };
  }

  const redirectUri = readNonEmptyString(value, 'redirectUri');
  if (!redirectUri) {
    return { reason: 'invalid_callback', status: 'error' };
  }

  return {
    callback: {
      code,
      redirectUri,
      state,
    },
    status: 'ok',
  };
};

/**
 * Redirects are compared exactly. Normalizing or prefix-matching a callback URI
 * would make an allowlist vulnerable to lookalike hosts and path confusion.
 */
export const isExactAllowedRedirectUri = (
  redirectUri: string,
  allowedRedirectUris: readonly string[],
): boolean => allowedRedirectUris.includes(redirectUri);
