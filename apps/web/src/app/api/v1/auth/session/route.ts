import { createHash } from 'node:crypto';

import {
  AuthenticationServiceError,
  authenticateSupabaseRequest,
  type AuthenticatedSupabaseRequest,
} from '@/lib/supabase/request-auth';
import { createApiErrorResponse, createRequestId, jsonNoStore } from '@/server/http/api-response';

export const runtime = 'nodejs';

const deriveSessionEpoch = (accessToken: string): number => {
  try {
    const payloadSegment = accessToken.split('.')[1];
    if (!payloadSegment) throw new Error('missing payload');
    const payload = JSON.parse(Buffer.from(payloadSegment, 'base64url').toString('utf8')) as {
      iat?: unknown;
      session_id?: unknown;
      sub?: unknown;
    };
    const marker =
      typeof payload.session_id === 'string'
        ? payload.session_id
        : `${String(payload.sub)}:${String(payload.iat)}`;
    const digest = createHash('sha256').update(marker).digest();
    return digest.readUIntBE(0, 6) + 1;
  } catch {
    throw new AuthenticationServiceError();
  }
};

interface SessionIdentityDependencies {
  authenticate: (request: Request) => Promise<AuthenticatedSupabaseRequest>;
}

const defaults: SessionIdentityDependencies = { authenticate: authenticateSupabaseRequest };

export const createGetSessionIdentityRoute =
  (dependencies: SessionIdentityDependencies = defaults) =>
  async (request: Request): Promise<Response> => {
    const requestId = createRequestId();
    try {
      const authenticated = await dependencies.authenticate(request);
      const { data, error } = await authenticated.client.auth.getSession();
      const accessToken = data.session?.access_token;
      if (error || !accessToken) throw new AuthenticationServiceError();
      return jsonNoStore(
        { sessionEpoch: deriveSessionEpoch(accessToken), userId: authenticated.user.id },
        { headers: authenticated.responseHeaders, requestId },
      );
    } catch (error) {
      return createApiErrorResponse(error, requestId);
    }
  };

export const GET = createGetSessionIdentityRoute();
