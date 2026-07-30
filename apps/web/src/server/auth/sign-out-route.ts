import { createSignOutSuccessResponse } from '@ideogram/contracts';

import {
  authenticateSupabaseRequest,
  type AuthenticatedSupabaseRequest,
} from '@/lib/supabase/request-auth';
import {
  ApiHttpError,
  createApiErrorResponse,
  createRequestId,
  jsonNoStore,
} from '@/server/http/api-response';
import { readJsonMutationBody } from '@/server/http/mutation-policy';
import {
  readWebAuthRouteConfiguration,
  type WebAuthRouteConfiguration,
} from '@/lib/supabase/auth-route-config';

interface SignOutRouteDependencies {
  authenticate: (request: Request) => Promise<AuthenticatedSupabaseRequest>;
  readBody: typeof readJsonMutationBody;
  readConfiguration: () => WebAuthRouteConfiguration;
}

const defaultDependencies: SignOutRouteDependencies = {
  authenticate: authenticateSupabaseRequest,
  readBody: readJsonMutationBody,
  readConfiguration: readWebAuthRouteConfiguration,
};

const invalidRequest = (message: string, status = 400): ApiHttpError =>
  new ApiHttpError({
    code: status === 403 ? 'FORBIDDEN' : 'INVALID_REQUEST',
    message,
    status,
  });

const serviceUnavailable = (): ApiHttpError =>
  new ApiHttpError({
    code: 'UNAVAILABLE',
    message: 'Dịch vụ xác thực tạm thời chưa sẵn sàng. Vui lòng thử lại.',
    status: 503,
  });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const assertEmptyBody = (value: unknown): void => {
  if (!isRecord(value) || Object.keys(value).length > 0) {
    throw invalidRequest('Yêu cầu đăng xuất chỉ chấp nhận nội dung JSON rỗng.');
  }
};

const readErrorStatus = (error: unknown): number | undefined => {
  if (!error || typeof error !== 'object' || !('status' in error)) {
    return undefined;
  }

  const status = error.status;
  return typeof status === 'number' ? status : undefined;
};

const signOutVerifiedSession = async (authenticatedRequest: AuthenticatedSupabaseRequest) => {
  if (authenticatedRequest.source !== 'cookie') {
    throw invalidRequest('Yêu cầu đăng xuất phải dùng phiên web cùng nguồn.', 403);
  }

  const { error } = await authenticatedRequest.client.auth.signOut({ scope: 'local' });
  const status = readErrorStatus(error);

  if (!error || status === 400 || status === 401 || status === 403) {
    return;
  }

  throw serviceUnavailable();
};

export const createSignOutRoute =
  (dependencies: SignOutRouteDependencies = defaultDependencies) =>
  async (request: Request): Promise<Response> => {
    const requestId = createRequestId();

    try {
      const configuration = dependencies.readConfiguration();
      const authenticatedRequest = await dependencies.authenticate(request);

      assertEmptyBody(
        await dependencies.readBody(request, {
          authenticationSource: authenticatedRequest.source,
          trustedOrigin: configuration.trustedOrigin,
        }),
      );

      await signOutVerifiedSession(authenticatedRequest);

      return jsonNoStore(createSignOutSuccessResponse(), {
        headers: authenticatedRequest.responseHeaders,
        requestId,
      });
    } catch (error) {
      return createApiErrorResponse(error, requestId);
    }
  };
