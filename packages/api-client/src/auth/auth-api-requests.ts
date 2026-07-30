import {
  dataSubjectRequestKinds,
  normalizeAuthEmailAddress,
  normalizeWebAuthReturnPath,
} from '@ideogram/contracts';

import type { DataSubjectRequestKind, EmailOtpRequestBody } from '@ideogram/contracts';

export const plannedAuthApiRoutes = {
  emailOtp: '/api/v1/auth/email-otp',
  signOut: '/api/v1/auth/sign-out',
} as const;

export const plannedPrivacyApiRoutes = {
  dataSubjectRequests: '/api/v1/privacy/data-subject-requests',
} as const;

export interface EmailOtpApiRequest {
  body: EmailOtpRequestBody;
  method: 'POST';
  path: typeof plannedAuthApiRoutes.emailOtp;
}

export interface DataSubjectRequestApiRequest {
  body: {
    idempotencyKey: string;
    requestKind: DataSubjectRequestKind;
  };
  method: 'POST';
  path: typeof plannedPrivacyApiRoutes.dataSubjectRequests;
}

export interface SignOutApiRequest {
  body: Record<string, never>;
  method: 'POST';
  path: typeof plannedAuthApiRoutes.signOut;
}

const opaqueUuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

/**
 * This request is intentionally invite-only: the server must ask Supabase for an
 * OTP with `shouldCreateUser: false`, after verifying an adult registration
 * approval. Direct clients cannot turn a missing account into a new account.
 */
export const createEmailOtpApiRequest = ({
  email,
  returnTo,
}: {
  email: string;
  returnTo?: string;
}): EmailOtpApiRequest => {
  return {
    body: {
      email: normalizeAuthEmailAddress(email),
      returnTo: normalizeWebAuthReturnPath(returnTo),
    },
    method: 'POST',
    path: plannedAuthApiRoutes.emailOtp,
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

export const createSignOutApiRequest = (): SignOutApiRequest => ({
  body: {},
  method: 'POST',
  path: plannedAuthApiRoutes.signOut,
});
