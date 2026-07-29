import { dataSubjectRequestKinds, isExactAllowedRedirectUri } from '@ideogram/contracts';

import type { DataSubjectRequestKind } from '@ideogram/contracts';

export const plannedAuthApiRoutes = {
  callback: '/api/v1/auth/callback',
  emailOtp: '/api/v1/auth/email-otp',
  signOut: '/api/v1/auth/sign-out',
} as const;

export const plannedPrivacyApiRoutes = {
  dataSubjectRequests: '/api/v1/privacy/data-subject-requests',
} as const;

export interface EmailOtpApiRequest {
  body: {
    email: string;
    redirectUri: string;
    shouldCreateUser: false;
  };
  method: 'POST';
  path: typeof plannedAuthApiRoutes.emailOtp;
}

export interface AuthorizationCodeExchangeApiRequest {
  body: {
    code: string;
    codeVerifier: string;
    nonce: string;
    redirectUri: string;
    state: string;
  };
  method: 'POST';
  path: typeof plannedAuthApiRoutes.callback;
}

export interface DataSubjectRequestApiRequest {
  body: {
    idempotencyKey: string;
    requestKind: DataSubjectRequestKind;
  };
  method: 'POST';
  path: typeof plannedPrivacyApiRoutes.dataSubjectRequests;
}

const opaqueUuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

const normalizeEmail = (email: string): string => {
  const normalized = email.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(normalized)) {
    throw new TypeError('email must be a valid email address.');
  }

  return normalized;
};

const assertNonEmpty = (value: string, field: string): string => {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new TypeError(`${field} must not be empty.`);
  }

  return normalized;
};

/**
 * This request is intentionally invite-only: the server must ask Supabase for an
 * OTP with `shouldCreateUser: false`, after verifying an adult registration
 * approval. Direct clients cannot turn a missing account into a new account.
 */
export const createEmailOtpApiRequest = ({
  allowedRedirectUris,
  email,
  redirectUri,
}: {
  allowedRedirectUris: readonly string[];
  email: string;
  redirectUri: string;
}): EmailOtpApiRequest => {
  if (!isExactAllowedRedirectUri(redirectUri, allowedRedirectUris)) {
    throw new TypeError('redirectUri must exactly match an approved callback URI.');
  }

  return {
    body: {
      email: normalizeEmail(email),
      redirectUri,
      shouldCreateUser: false,
    },
    method: 'POST',
    path: plannedAuthApiRoutes.emailOtp,
  };
};

export const createAuthorizationCodeExchangeApiRequest = ({
  allowedRedirectUris,
  code,
  codeVerifier,
  nonce,
  redirectUri,
  state,
}: {
  allowedRedirectUris: readonly string[];
  code: string;
  codeVerifier: string;
  nonce: string;
  redirectUri: string;
  state: string;
}): AuthorizationCodeExchangeApiRequest => {
  if (!isExactAllowedRedirectUri(redirectUri, allowedRedirectUris)) {
    throw new TypeError('redirectUri must exactly match an approved callback URI.');
  }

  return {
    body: {
      code: assertNonEmpty(code, 'code'),
      codeVerifier: assertNonEmpty(codeVerifier, 'codeVerifier'),
      nonce: assertNonEmpty(nonce, 'nonce'),
      redirectUri,
      state: assertNonEmpty(state, 'state'),
    },
    method: 'POST',
    path: plannedAuthApiRoutes.callback,
  };
};

export const createDataSubjectRequestApiRequest = ({
  idempotencyKey,
  requestKind,
}: {
  idempotencyKey: string;
  requestKind: DataSubjectRequestKind;
}): DataSubjectRequestApiRequest => {
  if (!opaqueUuidPattern.test(idempotencyKey)) {
    throw new TypeError('idempotencyKey must be an RFC 4122 UUID.');
  }

  if (!dataSubjectRequestKinds.includes(requestKind)) {
    throw new TypeError('requestKind must be export or deletion.');
  }

  return {
    body: {
      idempotencyKey: idempotencyKey.toLowerCase(),
      requestKind,
    },
    method: 'POST',
    path: plannedPrivacyApiRoutes.dataSubjectRequests,
  };
};
